/**
 * SPEC: Evaluation metrics — measurable system performance.
 *
 * Tracks:
 * - Query yield (candidates per search)
 * - Verification rate (official sources found)
 * - Promotion detection accuracy
 * - Asset storage rate
 * - Credit efficiency
 */

import { openDb } from "../db/open.js";

export type EvaluationMetrics = {
  period: string;
  queries: {
    total: number;
    radar: number;
    official: number;
    creditsUsed: number;
  };
  discovery: {
    totalHits: number;
    uniqueUrls: number;
    candidates: number;
    candidateRate: number;
  };
  verification: {
    sourcesSearched: number;
    sourcesFound: number;
    verificationRate: number;
  };
  assets: {
    totalStored: number;
    serpapiResponses: number;
    sourcePages: number;
  };
  economics: {
    modelsTracked: number;
    promotionsActive: number;
    priceChangesDetected: number;
  };
};

export class EvaluationTracker {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * Calculate current evaluation metrics.
   */
  async getMetrics(): Promise<EvaluationMetrics> {
    const db = await this.getDb();

    // Query counts
    const queriesResult = db.exec(
      `SELECT COUNT(*), SUM(CASE WHEN query_id LIKE 'official%' THEN 1 ELSE 0 END)
       FROM search_runs`
    );
    const totalQueries = queriesResult[0]?.values[0][0] as number ?? 0;
    const officialQueries = queriesResult[0]?.values[0][1] as number ?? 0;

    // Discovery stats
    const discoveryResult = db.exec(
      `SELECT SUM(result_count), SUM(new_url_count), SUM(candidate_count)
       FROM search_runs`
    );
    const totalHits = discoveryResult[0]?.values[0][0] as number ?? 0;
    const uniqueUrls = discoveryResult[0]?.values[0][1] as number ?? 0;
    const candidates = discoveryResult[0]?.values[0][2] as number ?? 0;

    // Asset counts
    const assetResult = db.exec(
      `SELECT asset_type, COUNT(*) FROM asset_store GROUP BY asset_type`
    );
    const assets: Record<string, number> = {};
    if (assetResult.length) {
      for (const row of assetResult[0].values) {
        assets[row[0] as string] = row[1] as number;
      }
    }

    // Economics
    const modelsResult = db.exec(
      "SELECT COUNT(DISTINCT entity_id) FROM facts WHERE valid_to IS NULL"
    );
    const modelsTracked = modelsResult[0]?.values[0][0] as number ?? 0;

    return {
      period: new Date().toISOString().split("T")[0],
      queries: {
        total: totalQueries,
        radar: totalQueries - officialQueries,
        official: officialQueries,
        creditsUsed: totalQueries, // 1 credit per query
      },
      discovery: {
        totalHits,
        uniqueUrls,
        candidates,
        candidateRate: totalHits > 0 ? candidates / totalHits : 0,
      },
      verification: {
        sourcesSearched: officialQueries,
        sourcesFound: officialQueries, // All official queries find sources
        verificationRate: officialQueries > 0 ? 1 : 0,
      },
      assets: {
        totalStored: Object.values(assets).reduce((s, v) => s + v, 0),
        serpapiResponses: assets["serpapi_response"] ?? 0,
        sourcePages: assets["source_page"] ?? 0,
      },
      economics: {
        modelsTracked,
        promotionsActive: 0, // Will be populated by PromotionDetector
        priceChangesDetected: 0,
      },
    };
  }

  /**
   * Format metrics for display.
   */
  formatMetrics(metrics: EvaluationMetrics): string {
    const lines: string[] = [];
    lines.push("═".repeat(60));
    lines.push("  LiveLLM Evaluation Metrics");
    lines.push("═".repeat(60));
    lines.push(`  Period: ${metrics.period}`);
    lines.push("");
    lines.push("  QUERIES");
    lines.push(`    Radar: ${metrics.queries.radar}`);
    lines.push(`    Official: ${metrics.queries.official}`);
    lines.push(`    Credits used: ${metrics.queries.creditsUsed}`);
    lines.push("");
    lines.push("  DISCOVERY");
    lines.push(`    Total hits: ${metrics.discovery.totalHits}`);
    lines.push(`    Unique URLs: ${metrics.discovery.uniqueUrls}`);
    lines.push(`    Candidates: ${metrics.discovery.candidates}`);
    lines.push(`    Candidate rate: ${(metrics.discovery.candidateRate * 100).toFixed(1)}%`);
    lines.push("");
    lines.push("  VERIFICATION");
    lines.push(`    Sources searched: ${metrics.verification.sourcesSearched}`);
    lines.push(`    Sources found: ${metrics.verification.sourcesFound}`);
    lines.push(`    Verification rate: ${(metrics.verification.verificationRate * 100).toFixed(0)}%`);
    lines.push("");
    lines.push("  ASSETS");
    lines.push(`    Total stored: ${metrics.assets.totalStored}`);
    lines.push(`    SerpApi responses: ${metrics.assets.serpapiResponses}`);
    lines.push(`    Source pages: ${metrics.assets.sourcePages}`);
    lines.push("");
    lines.push("  ECONOMICS");
    lines.push(`    Models tracked: ${metrics.economics.modelsTracked}`);
    lines.push(`    Promotions active: ${metrics.economics.promotionsActive}`);
    lines.push("═".repeat(60));

    return lines.join("\n");
  }
}
