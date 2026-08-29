#!/usr/bin/env node

/**
 * SPEC: Generates fixture files from synthetic data.
 * Run once to create the fixture directory for replay testing.
 *
 * Usage: node dist/generate-fixtures.js
 * Output: fixtures/serpapi/{requestHash}.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { FIXTURES } from "./fixtures-data.js";
import { requestHash } from "./search/canonical-request.js";
import type { SearchRequest } from "./search/types.js";

const FIXTURE_DIR = resolve(process.cwd(), "fixtures", "serpapi");
mkdirSync(FIXTURE_DIR, { recursive: true });

console.log(`Generating fixtures in ${FIXTURE_DIR}\n`);

for (const [id, fixture] of Object.entries(FIXTURES)) {
  const hash = requestHash(fixture.request as SearchRequest);
  const filePath = resolve(FIXTURE_DIR, `${hash}.json`);

  writeFileSync(filePath, JSON.stringify(fixture.response, null, 2));

  console.log(`  ${id}`);
  console.log(`    Hash: ${hash}`);
  console.log(`    Hits: ${fixture.response.hits.length}`);
  console.log(`    File: ${filePath}`);
}

console.log(`\nDone. ${Object.keys(FIXTURES).length} fixtures generated.`);
