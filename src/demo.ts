import { runRadar, type RadarConfig } from "./radar.js";

export type DemoConfig = {
  mode: string;
  fixtureDir?: string;
  dbPath: string;
};

/**
 * SPEC: What this does
 *
 * Full demo cycle showing the pipeline working end-to-end.
 * Runs: migrate → seed → radar → report
 *
 * Output format:
 * ┌─────────────────────────────────────────┐
 * │           LIVE LLM RADAR                │
 * ├─────────────────────────────────────────┤
 * │ Queries run:        4                   │
 * │ Raw results:       47                   │
 * │ Known URLs:        31                   │
 * │ New URLs:          16                   │
 * │ Candidates:         5                   │
 * │ Search IDs:    4 captured               │
 * └─────────────────────────────────────────┘
 */
export async function runDemo(config: DemoConfig): Promise<void> {
  console.log("═".repeat(50));
  console.log("  LIVE LLM — Demo Cycle");
  console.log("═".repeat(50));
  console.log();

  // 1. Migrate
  console.log("[demo] Running migrations...");
  const { migrate } = await import("./db/migrate.js");
  await migrate(config.dbPath);

  // 2. Seed queries
  console.log("[demo] Seeding discovery queries...");
  const { seedQueries } = await import("./db/seed.js");
  await seedQueries(config.dbPath);

  // 3. Run radar
  console.log("\n[demo] Running radar...\n");
  const results = await runRadar({
    mode: config.mode,
    fixtureDir: config.fixtureDir,
    dbPath: config.dbPath,
  });

  // 4. Summary
  const totalHits = results.reduce((s, r) => s + r.rawHits, 0);
  const totalNew = results.reduce((s, r) => s + r.newUrls, 0);
  const totalCandidates = results.reduce((s, r) => s + r.candidates, 0);
  const searchIds = results.filter((r) => r.searchId).length;

  console.log();
  console.log("═".repeat(50));
  console.log("  RESULTS");
  console.log("═".repeat(50));
  console.log(`  Queries run:        ${results.length}`);
  console.log(`  Raw results:        ${totalHits}`);
  console.log(`  Known URLs:         ${totalHits - totalNew}`);
  console.log(`  New URLs:           ${totalNew}`);
  console.log(`  Candidates:         ${totalCandidates}`);
  console.log(`  Search IDs:         ${searchIds} captured`);
  console.log("═".repeat(50));
}
