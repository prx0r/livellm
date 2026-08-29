import type { CacheStore } from "../search/local-cache.js";
import { openDb, saveDb } from "./open.js";

export class SqliteCacheStore implements CacheStore {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  async get(key: string) {
    const db = await this.getDb();
    const rows = db.exec("SELECT response_json, expires_at FROM search_cache WHERE request_hash = ?", [key]);
    if (!rows.length || !rows[0].values.length) return null;
    const [responseJson, expiresAt] = rows[0].values[0] as [string, string];
    return {
      expiresAt: new Date(expiresAt).getTime(),
      value: JSON.parse(responseJson),
    };
  }

  async put(key: string, expiresAt: number, value: unknown): Promise<void> {
    const db = await this.getDb();
    db.run(
      "INSERT OR REPLACE INTO search_cache (request_hash, created_at, expires_at, response_json) VALUES (?, ?, ?, ?)",
      [key, new Date().toISOString(), new Date(expiresAt).toISOString(), JSON.stringify(value)]
    );
    saveDb();
  }
}
