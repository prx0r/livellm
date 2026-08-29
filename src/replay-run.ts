import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ReplaySearchProvider } from "./search/replay.js";
import { shouldInvestigate } from "./discovery/prefilter.js";
import { canonicalUrl } from "./discovery/url.js";

export type ReplayConfig = {
  fixtureDir: string;
  dbPath: string;
};

/**
 * SPEC: What this does
 *
 * Replays recorded fixtures through the full pipeline without hitting SerpApi.
 * This validates the entire deterministic pipeline:
 *   URL canonicalization → prefilter scoring → candidate detection
 *
 * For each fixture file:
 * 1. Load the recorded SearchResponse
 * 2. Canonicalize all URLs
 * 3. Score each hit with the prefilter
 * 4. Report candidates
 *
 * This is the zero-cost test mode.
 */
export async function runReplay(config: ReplayConfig): Promise<void> {
  const provider = new ReplaySearchProvider(config.fixtureDir);

  // Find all fixture files
  const files = readdirSync(config.fixtureDir).filter((f) => f.endsWith(".json"));

  console.log(`[replay] Found ${files.length} fixtures in ${config.fixtureDir}`);

  let totalHits = 0;
  let totalCandidates = 0;

  for (const file of files) {
    const hash = file.replace(".json", "");
    console.log(`\n[replay] Fixture: ${hash}`);

    // We need to reconstruct the request from the fixture
    // For replay, the provider loads the fixture by request hash
    // We'll use a dummy request and let the fixture content speak
    const { readFileSync } = await import("node:fs");
    const fixture = JSON.parse(readFileSync(resolve(config.fixtureDir, file), "utf8"));

    const hits = fixture.hits ?? [];
    totalHits += hits.length;

    const candidates: Array<{ title: string; url: string; score: number }> = [];
    const knownUrls = new Set<string>();

    for (const hit of hits) {
      const canonical = canonicalUrl(hit.url);
      if (knownUrls.has(canonical)) continue;
      knownUrls.add(canonical);

      const scoreText = `${hit.title} ${hit.snippet ?? ""}`;
      const score = scoreText.replace(/\s+/g, " ").length > 0
        ? shouldInvestigate(scoreText) ? 1 : 0
        : 0;

      if (score > 0) {
        candidates.push({ title: hit.title, url: hit.url, score: 1 });
      }
    }

    totalCandidates += candidates.length;

    console.log(`  Hits: ${hits.length}`);
    console.log(`  Unique URLs: ${knownUrls.size}`);
    console.log(`  Candidates: ${candidates.length}`);

    if (candidates.length > 0) {
      for (const c of candidates.slice(0, 5)) {
        console.log(`    → ${c.title.slice(0, 60)}`);
      }
    }
  }

  console.log(`\n[replay] Total: ${totalHits} hits, ${totalCandidates} candidates across ${files.length} fixtures`);
}
