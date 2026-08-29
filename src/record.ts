import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SerpApiProvider } from "./search/serpapi.js";
import { canonicalRequest, requestHash } from "./search/canonical-request.js";
import { QUERIES } from "./discovery/query-registry.js";
import type { SearchRequest } from "./search/types.js";

export type RecordConfig = {
  fixtureDir: string;
  query?: string;
  engine?: string;
};

/**
 * SPEC: What this does
 *
 * Records live SerpApi responses as JSON fixtures for replay testing.
 * This is how we ration credits — record once, replay many times.
 *
 * Each fixture is saved as: {requestHash}.json
 * The requestHash is a SHA-256 of the canonical request.
 *
 * To record a fixture:
 * 1. Build the SearchRequest from args or query registry
 * 2. Call SerpApi live
 * 3. Save the full SearchResponse (with raw) to fixtureDir/{hash}.json
 *
 * Expected output: fixture file that can be loaded by ReplaySearchProvider
 */
export async function runRecord(config: RecordConfig): Promise<void> {
  mkdirSync(config.fixtureDir, { recursive: true });

  const provider = new SerpApiProvider();

  // Build request
  let request: SearchRequest;
  if (config.query && config.engine) {
    request = {
      engine: config.engine as SearchRequest["engine"],
      q: config.query,
      params: { hl: "en", gl: "us" },
    };
  } else {
    // Record the first query from registry
    const q = QUERIES[0];
    request = q.request;
  }

  console.log(`[record] Engine: ${request.engine}`);
  console.log(`[record] Query: ${request.q}`);
  console.log(`[record] Params: ${JSON.stringify(request.params)}`);

  const response = await provider.search(request);

  const hash = requestHash(request);
  const filePath = resolve(config.fixtureDir, `${hash}.json`);

  // Save the full response including raw for replay
  writeFileSync(filePath, JSON.stringify(response, null, 2));

  console.log(`[record] Saved ${response.hits.length} hits → ${filePath}`);
  console.log(`[record] Search ID: ${response.searchId ?? "N/A"}`);
  console.log(`[record] Hash: ${hash}`);
}

/**
 * SPEC: Record all queries from the registry.
 * Use this to build a complete fixture set.
 */
export async function recordAll(config: RecordConfig): Promise<void> {
  for (const q of QUERIES) {
    console.log(`\n--- Recording: ${q.id} ---`);
    await runRecord({
      ...config,
      query: q.request.q,
      engine: q.request.engine,
    });
  }
}
