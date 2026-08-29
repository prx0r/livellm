import { openDb, saveDb } from "./open.js";
import { QUERIES } from "../discovery/query-registry.js";

export async function seedQueries(dbPath?: string): Promise<void> {
  const db = await openDb(dbPath);

  for (const q of QUERIES) {
    try {
      db.run(
        `INSERT OR IGNORE INTO discovery_queries
          (query_id, engine, query_text, params_json, purpose, min_interval_seconds, enabled)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [q.id, q.request.engine, q.request.q, JSON.stringify(q.request.params ?? {}), q.purpose, q.minIntervalHours * 3600]
      );
    } catch (err: any) {
      if (!err.message?.includes("UNIQUE")) {
        console.error(`Seed error for ${q.id}: ${err.message}`);
      }
    }
  }
  saveDb();
}
