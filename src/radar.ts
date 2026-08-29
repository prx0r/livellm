import { openDb } from "./db/open.js";
import { SearchRunRepo } from "./db/search-runs.js";
import { SqliteCacheStore } from "./db/cache.js";
import { SerpApiProvider } from "./search/serpapi.js";
import { CachedSearchProvider } from "./search/local-cache.js";
import { ReplaySearchProvider } from "./search/replay.js";
import { shouldInvestigate } from "./discovery/prefilter.js";
import { canonicalUrl } from "./discovery/url.js";
import { QUERIES } from "./discovery/query-registry.js";
import type { SearchProvider, SearchHit, SearchRequest } from "./search/types.js";
import { mkdirSync } from "node:fs";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type RadarConfig = {
  mode: string;
  fixtureDir?: string;
  dbPath: string;
};

export type RadarResult = {
  queryId: string;
  engine: string;
  query: string;
  rawHits: number;
  knownUrls: number;
  newUrls: number;
  candidates: number;
  searchId?: string;
  fromCache: boolean;
};

/**
 * SPEC: What this pipeline does
 *
 * For each enabled discovery query:
 * 1. Check if enough time has passed since last run (min_interval_seconds)
 * 2. Build a SearchRequest from the query registry
 * 3. Execute via the configured provider (live SerpApi or replay)
 * 4. Canonicalize each URL to detect known vs new
 * 5. Run deterministic prefilter scoring on title+snippet
 * 6. Candidates with score >= threshold are flagged for investigation
 * 7. Log the search run to SQLite for provenance
 *
 * Expected SerpApi response shape (google_news_light):
 * {
 *   "search_metadata": { "id": "68abc...", "status": "Success" },
 *   "news_results": [
 *     { "position": 1, "title": "...", "link": "https://...",
 *       "snippet": "...", "source": { "name": "TechCrunch" },
 *       "iso_date": "2026-08-29T10:00:00Z" }
 *   ]
 * }
 *
 * Expected SerpApi response shape (google_light):
 * {
 *   "search_metadata": { "id": "68def...", "status": "Success" },
 *   "organic_results": [
 *     { "position": 1, "title": "...", "link": "https://...",
 *       "snippet": "..." }
 *   ],
 *   "related_questions": [...],
 *   "related_searches": [...]
 * }
 */
export async function runRadar(config: RadarConfig): Promise<RadarResult[]> {
  const db = await openDb(config.dbPath);
  const runRepo = new SearchRunRepo();

  // Build provider
  let provider: SearchProvider;
  if (config.mode === "replay") {
    if (!config.fixtureDir) throw new Error("--fixture-dir required in replay mode");
    provider = new ReplaySearchProvider(config.fixtureDir);
  } else {
    const live = new SerpApiProvider();
    const cache = new SqliteCacheStore();
    provider = new CachedSearchProvider(live, cache, 60 * 60 * 1000);
  }

  // Load enabled queries
  const rowsResult = db.exec("SELECT * FROM discovery_queries WHERE enabled = 1");
  const rows: Array<{
    query_id: string;
    engine: string;
    query_text: string;
    params_json: string;
    purpose: string;
    min_interval_seconds: number;
    last_run_at: string | null;
  }> = [];

  if (rowsResult.length) {
    const cols = rowsResult[0].columns;
    for (const vals of rowsResult[0].values) {
      const obj: any = {};
      cols.forEach((c: string, i: number) => (obj[c] = vals[i]));
      rows.push(obj);
    }
  }

  const now = Date.now();
  const results: RadarResult[] = [];

  // Track known URLs across queries for cross-query dedup
  const knownUrls = new Set<string>();
  const seenFile = resolve(config.dbPath, "../known-urls.json");
  if (existsSync(seenFile)) {
    try {
      const arr = JSON.parse(readFileSync(seenFile, "utf8")) as string[];
      arr.forEach((u) => knownUrls.add(u));
    } catch {}
  }

  const isReplay = config.mode === "replay";

  for (const row of rows) {
    // In replay mode, skip interval check (no API credits spent)
    if (!isReplay) {
      const lastRun = row.last_run_at ? new Date(row.last_run_at).getTime() : 0;
      const intervalMs = row.min_interval_seconds * 1000;
      if (now - lastRun < intervalMs) {
        continue; // Not yet due
      }
    }

    const request = {
      engine: row.engine as SearchRequest["engine"],
      q: row.query_text,
      params: JSON.parse(row.params_json),
    };

    console.log(`[radar] ${row.query_id}: ${row.engine} "${row.query_text.slice(0, 60)}..."`);

    try {
      const response = await provider.search(request);
      const searchId = response.searchId;
      const rawHits = response.hits.length;

      // Canonicalize and dedupe
      const canonicals = response.hits.map((h) => ({
        hit: h,
        canonical: canonicalUrl(h.url),
      }));

      const newUrls: SearchHit[] = [];
      const candidates: SearchHit[] = [];

      for (const { hit, canonical } of canonicals) {
        if (knownUrls.has(canonical)) continue;
        newUrls.push(hit);
        knownUrls.add(canonical);

        const scoreText = `${hit.title} ${hit.snippet ?? ""}`;
        if (shouldInvestigate(scoreText)) {
          candidates.push(hit);
        }
      }

      // Record the run
      await runRepo.create({
        queryId: row.query_id,
        request,
        searchId,
        fromLocalCache: response.fromCache,
        resultCount: rawHits,
        newUrlCount: newUrls.length,
        candidateCount: candidates.length,
        verifiedChangeCount: 0,
      });
      await runRepo.incrementRunCount(row.query_id);

      const result: RadarResult = {
        queryId: row.query_id,
        engine: row.engine,
        query: row.query_text,
        rawHits,
        knownUrls: rawHits - newUrls.length,
        newUrls: newUrls.length,
        candidates: candidates.length,
        searchId,
        fromCache: response.fromCache,
      };
      results.push(result);

      console.log(
        `  → ${rawHits} hits, ${newUrls.length} new, ${candidates.length} candidates` +
          (searchId ? ` (search: ${searchId.slice(0, 12)}...)` : "")
      );
    } catch (err: any) {
      console.error(`  ✗ ${err.message}`);
    }
  }

  // Persist known URLs
  mkdirSync(resolve(config.dbPath, ".."), { recursive: true });
  writeFileSync(seenFile, JSON.stringify([...knownUrls], null, 2));

  // Summary
  const totalHits = results.reduce((s, r) => s + r.rawHits, 0);
  const totalNew = results.reduce((s, r) => s + r.newUrls, 0);
  const totalCandidates = results.reduce((s, r) => s + r.candidates, 0);
  console.log(
    `\n[radar] Complete: ${results.length} queries, ${totalHits} hits, ${totalNew} new URLs, ${totalCandidates} candidates`
  );

  return results;
}
