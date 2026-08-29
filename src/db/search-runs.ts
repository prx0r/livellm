import crypto from "node:crypto";
import { openDb, saveDb } from "./open.js";
import type { SearchRequest } from "../search/types.js";

export type SearchRunRow = {
  search_run_id: string;
  query_id: string;
  request_hash: string;
  serpapi_search_id: string | null;
  executed_at: string;
  from_local_cache: number;
  response_hash: string | null;
  result_count: number;
  new_url_count: number;
  candidate_count: number;
  verified_change_count: number;
};

export class SearchRunRepo {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  async create(params: {
    queryId: string;
    request: SearchRequest;
    searchId?: string;
    fromLocalCache: boolean;
    resultCount: number;
    newUrlCount: number;
    candidateCount: number;
    verifiedChangeCount: number;
    responseHash?: string;
  }): Promise<string> {
    const db = await this.getDb();
    const id = crypto.randomUUID();
    const requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(params.request))
      .digest("hex");

    db.run(
      `INSERT INTO search_runs
        (search_run_id, query_id, request_hash, serpapi_search_id, executed_at,
         from_local_cache, response_hash, result_count, new_url_count,
         candidate_count, verified_change_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.queryId,
        requestHash,
        params.searchId ?? null,
        new Date().toISOString(),
        params.fromLocalCache ? 1 : 0,
        params.responseHash ?? null,
        params.resultCount,
        params.newUrlCount,
        params.candidateCount,
        params.verifiedChangeCount,
      ]
    );
    saveDb();
    return id;
  }

  async incrementRunCount(queryId: string): Promise<void> {
    const db = await this.getDb();
    db.run(
      "UPDATE discovery_queries SET paid_runs = paid_runs + 1, last_run_at = ? WHERE query_id = ?",
      [new Date().toISOString(), queryId]
    );
    saveDb();
  }

  async getRecent(queryId: string, limit = 10): Promise<SearchRunRow[]> {
    const db = await this.getDb();
    const rows = db.exec(
      "SELECT * FROM search_runs WHERE query_id = ? ORDER BY executed_at DESC LIMIT ?",
      [queryId, limit]
    );
    if (!rows.length) return [];
    const cols = rows[0].columns;
    return rows[0].values.map((vals: any[]) => {
      const obj: any = {};
      cols.forEach((c: string, i: number) => (obj[c] = vals[i]));
      return obj;
    });
  }
}
