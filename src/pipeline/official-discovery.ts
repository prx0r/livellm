/**
 * SPEC: Run official-source discovery.
 * Targeted searches for known provider pricing pages.
 * Each costs 1 credit but gives authoritative data.
 */

import { SerpApiProvider, getSerpApiAccount, allowedPaidBatch } from "../search/serpapi.js";
import { OFFICIAL_QUERIES } from "../discovery/official-queries.js";
import { AssetStore } from "../db/assets.js";
import { requestHash } from "../search/canonical-request.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export type OfficialDiscoveryConfig = {
  fixtureDir?: string;
  maxSearches?: number;
};

export async function runOfficialDiscovery(
  config: OfficialDiscoveryConfig = {}
): Promise<void> {
  const maxSearches = config.maxSearches ?? 8;
  const fixtureDir = config.fixtureDir ?? "./fixtures/official";

  mkdirSync(fixtureDir, { recursive: true });

  // Check quota
  const account = await getSerpApiAccount();
  const budget = allowedPaidBatch(account.total_searches_left, maxSearches, 20);

  console.log(`[official] Quota: ${account.total_searches_left} left, budget: ${budget} searches`);

  if (budget === 0) {
    console.log("[official] Not enough quota");
    return;
  }

  const provider = new SerpApiProvider();
  const assetStore = new AssetStore();
  const searches = Math.min(budget, OFFICIAL_QUERIES.length);

  console.log(`[official] Running ${searches} official-source queries\n`);

  for (const query of OFFICIAL_QUERIES.slice(0, searches)) {
    console.log(`→ ${query.provider}: ${query.purpose}`);

    try {
      const response = await provider.search(query.request);

      // Store as asset (content-addressed)
      if (response.raw) {
        await assetStore.storeSerpApiResult({
          queryId: query.id,
          searchId: response.searchId,
          requestHash: requestHash(query.request),
          response: response.raw,
        });
      }

      // Save fixture
      const fixturePath = resolve(fixtureDir, `${query.id}.json`);
      writeFileSync(fixturePath, JSON.stringify(response.raw, null, 2));

      // Find official URL
      const officialHits = response.hits.filter((h) => {
        const url = h.url.toLowerCase();
        const provider = query.provider.toLowerCase();
        return url.includes(provider) || url.includes(provider.replace(" ", ""));
      });

      if (officialHits.length > 0) {
        console.log(`  ✓ Found: ${officialHits[0].url}`);
      } else {
        console.log(`  ✗ No official URL in results`);
      }

      console.log(`  Search ID: ${response.searchId ?? "N/A"}`);
    } catch (err: any) {
      console.error(`  ✗ ${err.message}`);
    }
  }
}
