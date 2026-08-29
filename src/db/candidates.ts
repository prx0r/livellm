import crypto from "node:crypto";
import { openDb, saveDb } from "./open.js";

export type CandidateRow = {
  candidate_id: string;
  fingerprint: string;
  provider_hint: string | null;
  product_hint: string | null;
  change_type: string | null;
  discovered_at: string;
  state: string;
  priority: number;
  official_source_url: string | null;
  notes_json: string;
};

export class CandidateRepo {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * SPEC: Create or update a candidate from a search hit.
   *
   * Fingerprint = hash of (provider_hint + product_hint + change_type)
   * to dedupe multiple hits about the same potential change.
   */
  async upsert(params: {
    providerHint?: string;
    productHint?: string;
    changeType?: string;
    officialSourceUrl?: string;
    priority?: number;
    notes?: Record<string, unknown>;
  }): Promise<string> {
    const db = await this.getDb();
    const fingerprint = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          p: params.providerHint ?? "",
          d: params.productHint ?? "",
          c: params.changeType ?? "",
        })
      )
      .digest("hex");

    // Check if exists
    const existing = db.exec(
      "SELECT candidate_id FROM candidates WHERE fingerprint = ?",
      [fingerprint]
    );

    if (existing.length && existing[0].values.length) {
      // Update priority if higher
      const id = existing[0].values[0][0] as string;
      db.run(
        "UPDATE candidates SET priority = MAX(priority, ?), official_source_url = COALESCE(?, official_source_url) WHERE candidate_id = ?",
        [params.priority ?? 0, params.officialSourceUrl ?? null, id]
      );
      saveDb();
      return id;
    }

    const id = crypto.randomUUID();
    db.run(
      `INSERT INTO candidates
        (candidate_id, fingerprint, provider_hint, product_hint, change_type,
         discovered_at, state, priority, official_source_url, notes_json)
       VALUES (?, ?, ?, ?, ?, ?, 'unverified', ?, ?, ?)`,
      [
        id,
        fingerprint,
        params.providerHint ?? null,
        params.productHint ?? null,
        params.changeType ?? null,
        new Date().toISOString(),
        params.priority ?? 0,
        params.officialSourceUrl ?? null,
        JSON.stringify(params.notes ?? {}),
      ]
    );
    saveDb();
    return id;
  }

  async setState(candidateId: string, state: string): Promise<void> {
    const db = await this.getDb();
    db.run("UPDATE candidates SET state = ? WHERE candidate_id = ?", [
      state,
      candidateId,
    ]);
    saveDb();
  }

  async getByState(state: string): Promise<CandidateRow[]> {
    const db = await this.getDb();
    const rows = db.exec("SELECT * FROM candidates WHERE state = ?", [state]);
    if (!rows.length) return [];
    const cols = rows[0].columns;
    return rows[0].values.map((vals: any[]) => {
      const obj: any = {};
      cols.forEach((c: string, i: number) => (obj[c] = vals[i]));
      return obj;
    });
  }

  async getUnverified(): Promise<CandidateRow[]> {
    return this.getByState("unverified");
  }
}
