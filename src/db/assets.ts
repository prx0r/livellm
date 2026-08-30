/**
 * SPEC: Asset store — every SerpApi response becomes a permanent asset.
 *
 * This is the historical moat. Every search:
 * 1. Gets stored with content hash
 * 2. Links to its search ID
 * 3. Becomes queryable for change detection
 * 4. Builds the query yield history
 */

import crypto from "node:crypto";
import { openDb, saveDb } from "../db/open.js";

export type AssetRecord = {
  asset_id: string;
  asset_type: "serpapi_response" | "source_page" | "ai_extraction" | "fact";
  content_hash: string;
  content_json: string;
  source_url?: string;
  search_id?: string;
  query_id?: string;
  observed_at: string;
  metadata_json?: string;
};

export class AssetStore {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * Store a SerpApi response as a content-addressed asset.
   */
  async storeSerpApiResult(params: {
    queryId: string;
    searchId?: string;
    requestHash: string;
    response: any;
  }): Promise<string> {
    const db = await this.getDb();
    const contentHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(params.response))
      .digest("hex");

    // Check if we already have this exact response
    const existing = db.exec(
      "SELECT asset_id FROM asset_store WHERE content_hash = ?",
      [contentHash]
    );

    if (existing.length && existing[0].values.length) {
      return existing[0].values[0][0] as string;
    }

    const assetId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO asset_store
        (asset_id, asset_type, content_hash, content_json, search_id, query_id, observed_at, metadata_json)
       VALUES (?, 'serpapi_response', ?, ?, ?, ?, ?, ?)`,
      [
        assetId,
        contentHash,
        JSON.stringify(params.response),
        params.searchId ?? null,
        params.queryId,
        now,
        JSON.stringify({ requestHash: params.requestHash }),
      ]
    );

    saveDb();
    return assetId;
  }

  /**
   * Store a source page as an asset.
   */
  async storeSourcePage(params: {
    url: string;
    content: string;
    searchId?: string;
  }): Promise<string> {
    const db = await this.getDb();
    const contentHash = crypto
      .createHash("sha256")
      .update(params.content)
      .digest("hex");

    // Check if we already have this exact content
    const existing = db.exec(
      "SELECT asset_id FROM asset_store WHERE content_hash = ?",
      [contentHash]
    );

    if (existing.length && existing[0].values.length) {
      return existing[0].values[0][0] as string;
    }

    const assetId = crypto.randomUUID();

    db.run(
      `INSERT INTO asset_store
        (asset_id, asset_type, content_hash, content_json, source_url, search_id, observed_at)
       VALUES (?, 'source_page', ?, ?, ?, ?, ?)`,
      [
        assetId,
        contentHash,
        params.content.slice(0, 100000), // Cap at 100KB
        params.url,
        params.searchId ?? null,
        new Date().toISOString(),
      ]
    );

    saveDb();
    return assetId;
  }

  /**
   * Check if we've seen this content before.
   */
  async hasContent(contentHash: string): Promise<boolean> {
    const db = await this.getDb();
    const rows = db.exec(
      "SELECT asset_id FROM asset_store WHERE content_hash = ?",
      [contentHash]
    );
    return rows.length > 0 && rows[0].values.length > 0;
  }

  /**
   * Get content hash without storing.
   */
  static contentHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Get asset statistics.
   */
  async getStats(): Promise<{
    totalAssets: number;
    byType: Record<string, number>;
    oldestAsset?: string;
    newestAsset?: string;
  }> {
    const db = await this.getDb();

    const total = db.exec("SELECT COUNT(*) FROM asset_store");
    const byType = db.exec(
      "SELECT asset_type, COUNT(*) FROM asset_store GROUP BY asset_type"
    );
    const oldest = db.exec(
      "SELECT MIN(observed_at) FROM asset_store"
    );
    const newest = db.exec(
      "SELECT MAX(observed_at) FROM asset_store"
    );

    const stats: Record<string, number> = {};
    if (byType.length) {
      for (const row of byType[0].values) {
        stats[row[0] as string] = row[1] as number;
      }
    }

    return {
      totalAssets: total[0]?.values[0][0] as number ?? 0,
      byType: stats,
      oldestAsset: oldest[0]?.values[0][0] as string ?? undefined,
      newestAsset: newest[0]?.values[0][0] as string ?? undefined,
    };
  }
}
