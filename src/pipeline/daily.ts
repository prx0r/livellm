/**
 * SPEC: Daily cycle — the autonomous intelligence loop.
 *
 * This is what runs every day:
 * 1. Check quota
 * 2. Run radar (discovery)
 * 3. Run official sources (verification)
 * 4. Store all as assets
 * 5. Detect changes
 * 6. Recompute economics
 * 7. Generate report
 */

import { runRadar } from "../radar.js";
import { runOfficialDiscovery } from "./official-discovery.js";
import { AssetStore } from "../db/assets.js";
import { ChangeDetector } from "./change-detector.js";
import { resolve } from "node:path";

export type DailyConfig = {
  dbPath: string;
  fixtureDir?: string;
  mode?: string;
};

export type DailyReport = {
  date: string;
  radar: {
    queries: number;
    hits: number;
    candidates: number;
    assetsStored: number;
  };
  official: {
    queries: number;
    sourcesFound: number;
  };
  changes: {
    urlsChecked: number;
    changesDetected: number;
  };
  assets: {
    total: number;
    newToday: number;
  };
  quota: {
    remaining: number;
    usedToday: number;
  };
};

export async function runDaily(config: DailyConfig): Promise<DailyReport> {
  console.log("═".repeat(60));
  console.log("  LiveLLM — Daily Intelligence Cycle");
  console.log("  " + new Date().toISOString().split("T")[0]);
  console.log("═".repeat(60));
  console.log();

  const report: DailyReport = {
    date: new Date().toISOString().split("T")[0],
    radar: { queries: 0, hits: 0, candidates: 0, assetsStored: 0 },
    official: { queries: 0, sourcesFound: 0 },
    changes: { urlsChecked: 0, changesDetected: 0 },
    assets: { total: 0, newToday: 0 },
    quota: { remaining: 0, usedToday: 0 },
  };

  // 1. Run radar
  console.log("1. RADAR DISCOVERY");
  const radarResults = await runRadar({
    mode: config.mode ?? "live",
    fixtureDir: config.fixtureDir,
    dbPath: config.dbPath,
  });

  report.radar.queries = radarResults.length;
  report.radar.hits = radarResults.reduce((s, r) => s + r.rawHits, 0);
  report.radar.candidates = radarResults.reduce((s, r) => s + r.candidates, 0);

  // 2. Run official sources
  console.log();
  console.log("2. OFFICIAL SOURCE DISCOVERY");
  try {
    await runOfficialDiscovery({
      fixtureDir: resolve(config.fixtureDir ?? "./fixtures", "official"),
      maxSearches: 4, // Limit to save credits
    });
  } catch (err: any) {
    console.log(`  [skip] ${err.message}`);
  }

  // 3. Check assets
  console.log();
  console.log("3. ASSET STORE");
  const assetStore = new AssetStore();
  const stats = await assetStore.getStats();
  report.assets.total = stats.totalAssets;
  console.log(`  Total assets: ${stats.totalAssets}`);

  // 4. Detect changes
  console.log();
  console.log("4. CHANGE DETECTION");
  const detector = new ChangeDetector();
  const stale = await detector.getStaleUrls(24);
  report.changes.urlsChecked = stale.length;
  console.log(`  URLs to recheck: ${stale.length}`);

  // 5. Summary
  console.log();
  console.log("═".repeat(60));
  console.log("  DAILY REPORT");
  console.log("═".repeat(60));
  console.log(`  Date: ${report.date}`);
  console.log(`  Radar: ${report.radar.queries} queries, ${report.radar.hits} hits, ${report.radar.candidates} candidates`);
  console.log(`  Assets: ${report.assets.total} total`);
  console.log(`  Changes: ${report.changes.urlsChecked} URLs to recheck`);
  console.log("═".repeat(60));

  return report;
}
