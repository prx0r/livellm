import { openDb } from "./db/open.js";
import { SearchRunRepo } from "./db/search-runs.js";
import { CandidateRepo } from "./db/candidates.js";
import { AssetStore } from "./db/assets.js";
import { SqliteCacheStore } from "./db/cache.js";
import { SerpApiProvider, getSerpApiAccount, allowedPaidBatch } from "./search/serpapi.js";
import { CachedSearchProvider } from "./search/local-cache.js";
import { ReplaySearchProvider } from "./search/replay.js";
import { shouldInvestigate } from "./discovery/prefilter.js";
import { canonicalUrl } from "./discovery/url.js";
import { QUERIES } from "./discovery/query-registry.js";
import { detectCandidateHints, findOfficialUrl } from "./discovery/candidate-detect.js";
import { requestHash } from "./search/canonical-request.js";
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
  const candidateRepo = new CandidateRepo();
  const assetStore = new AssetStore();

  // Build provider
  let provider: SearchProvider;
  let budget = 10; // Default for replay mode
  if (config.mode === "replay") {
    if (!config.fixtureDir) throw new Error("--fixture-dir required in replay mode");
    provider = new ReplaySearchProvider(config.fixtureDir);
  } else {
    // Check quota governor before making live SerpApi calls
    const account = await getSerpApiAccount();
    budget = allowedPaidBatch(
      account.total_searches_left,
      parseInt(process.env.LLMDEALS_SERPAPI_DAILY_BUDGET ?? "4"),
      parseInt(process.env.LLMDEALS_SERPAPI_MONTHLY_RESERVE ?? "20")
    );
    console.log(`[radar] Quota: ${account.total_searches_left} left, budget: ${budget} searches`);

    if (budget === 0) {
      console.log("[radar] Quota guard — not enough searches remaining");
      return [];
    }

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
  let searchesUsed = 0;

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
    // Budget cap — stop if we've used all allowed searches
    if (!isReplay && searchesUsed >= budget) {
      console.log(`[radar] Budget cap reached (${budget} searches used)`);
      break;
    }

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

      // Store SerpApi response as asset (content-addressed)
      if (response.raw) {
        await assetStore.storeSerpApiResult({
          queryId: row.query_id,
          searchId: response.searchId,
          requestHash: requestHash(request),
          response: response.raw,
        });
      }

      // Extract Google Light related searches/questions as adaptive query candidates
      if (response.envelope?.relatedQuestions?.length) {
        for (const rq of response.envelope.relatedQuestions) {
          if (rq.question && rq.question.length > 5) {
            console.log(`[radar]   Related Question: "${rq.question.slice(0, 60)}"`);
          }
        }
      }
      if (response.envelope?.relatedSearches?.length) {
        for (const rs of response.envelope.relatedSearches) {
          if (rs.query && rs.query.length > 5) {
            console.log(`[radar]   Related Search: "${rs.query.slice(0, 60)}"`);
          }
        }
      }

      // Track budget usage (replay doesn't count)
      if (!isReplay && !response.fromCache) {
        searchesUsed++;
      }

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

          // Extract structured hints and store candidate
          const hints = detectCandidateHints(hit);
          const officialUrl = findOfficialUrl(response.hits, hints.providerHint);
          await candidateRepo.upsert({
            providerHint: hints.providerHint,
            productHint: hints.productHint,
            changeType: hints.changeType,
            officialSourceUrl: officialUrl,
            priority: hints.confidence,
            notes: { searchId, queryId: row.query_id, url: hit.url },
          });
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

  // Show quota status (only when live, not replay)
  if (config.mode !== "replay") {
    try {
      const account = await getSerpApiAccount();
      console.log(`[radar] SerpApi quota: ${account.monthly_searches_left} monthly searches remaining`);
    } catch {
      // Quota check is best-effort
    }
  }

  console.log(
    `\n[radar] Complete: ${results.length} queries, ${totalHits} hits, ${totalNew} new URLs, ${totalCandidates} candidates`
  );

  return results;
}
