/**
 * SPEC: Change detector — compares current vs historical SerpApi responses.
 *
 * When a new asset is stored:
 * 1. Check if we've seen this URL before
 * 2. If yes: compare content hash → detect change
 * 3. If no: mark as new discovery
 */

import { openDb } from "../db/open.js";

export type ChangeDetection = {
  url: string;
  status: "new" | "unchanged" | "changed";
  previousHash?: string;
  currentHash: string;
  previousObservedAt?: string;
  currentObservedAt: string;
};

export class ChangeDetector {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * Detect changes for a set of URLs.
   * Compares latest two observations for each URL.
   */
  async detectChanges(urls: string[]): Promise<ChangeDetection[]> {
    const db = await this.getDb();
    const results: ChangeDetection[] = [];

    for (const url of urls) {
      // Get the two most recent assets for this URL
      const rows = db.exec(
        `SELECT content_hash, observed_at
         FROM asset_store
         WHERE source_url = ?
         ORDER BY observed_at DESC
         LIMIT 2`,
        [url]
      );

      if (!rows.length || !rows[0].values.length) {
        results.push({
          url,
          status: "new",
          currentHash: "",
          currentObservedAt: new Date().toISOString(),
        });
        continue;
      }

      const [currentHash, currentObservedAt] = rows[0].values[0] as [string, string];

      if (rows[0].values.length < 2) {
        // Only one observation — can't compare
        results.push({
          url,
          status: "new",
          currentHash,
          currentObservedAt,
        });
        continue;
      }

      const [previousHash, previousObservedAt] = rows[0].values[1] as [string, string];

      results.push({
        url,
        status: currentHash === previousHash ? "unchanged" : "changed",
        previousHash,
        currentHash,
        previousObservedAt,
        currentObservedAt,
      });
    }

    return results;
  }

  /**
   * Get change history for a URL.
   */
  async getChangeHistory(url: string, limit = 10): Promise<Array<{
    contentHash: string;
    observedAt: string;
  }>> {
    const db = await this.getDb();
    const rows = db.exec(
      `SELECT content_hash, observed_at
       FROM asset_store
       WHERE source_url = ?
       ORDER BY observed_at DESC
       LIMIT ?`,
      [url, limit]
    );

    if (!rows.length) return [];

    return rows[0].values.map((row: any[]) => ({
      contentHash: row[0] as string,
      observedAt: row[1] as string,
    }));
  }

  /**
   * Get URLs whose most recent observation is older than threshold.
   */
  async getStaleUrls(olderThanHours = 24): Promise<string[]> {
    const db = await this.getDb();
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    const rows = db.exec(
      `SELECT source_url
       FROM asset_store
       WHERE source_url IS NOT NULL
       GROUP BY source_url
       HAVING MAX(observed_at) < ?`,
      [cutoff]
    );

    if (!rows.length) return [];
    return rows[0].values.map((row: any[]) => row[0] as string);
  }
}
