/**
 * SPEC: Fact repository — database operations for facts and evidence.
 */

import crypto from "node:crypto";
import { openDb, saveDb } from "../db/open.js";

export class FactRepo {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * SPEC: Create an evidence record linking to the observation.
   */
  async createEvidence(params: {
    observationId: string;
    field: string;
    quoteText: string;
    selectorOrPath?: string;
  }): Promise<string> {
    const db = await this.getDb();
    const id = crypto.randomUUID();
    const evidenceHash = crypto
      .createHash("sha256")
      .update(params.quoteText)
      .digest("hex");

    db.run(
      `INSERT INTO evidence
        (evidence_id, observation_id, field, quote_text, selector_or_path, evidence_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.observationId,
        params.field,
        params.quoteText,
        params.selectorOrPath ?? null,
        evidenceHash,
      ]
    );
    saveDb();
    return id;
  }

  /**
   * SPEC: Get current active fact for entity+field.
   */
  async getCurrentFact(entityId: string, field: string) {
    const db = await this.getDb();
    const rows = db.exec(
      `SELECT fact_id, value_json, unit, confidence, evidence_id, valid_from
       FROM facts
       WHERE entity_id = ? AND field = ? AND valid_to IS NULL`,
      [entityId, field]
    );

    if (!rows.length || !rows[0].values.length) return null;

    const [factId, valueJson, unit, confidence, evidenceId, validFrom] =
      rows[0].values[0];

    return {
      factId,
      value: JSON.parse(valueJson as string),
      unit,
      confidence,
      evidenceId,
      validFrom,
    };
  }

  /**
   * SPEC: Get all current facts for an entity.
   */
  async getEntityFacts(entityId: string) {
    const db = await this.getDb();
    const rows = db.exec(
      `SELECT fact_id, field, value_json, unit, confidence, valid_from
       FROM facts
       WHERE entity_id = ? AND valid_to IS NULL`,
      [entityId]
    );

    if (!rows.length) return [];

    return rows[0].values.map((row: any[]) => ({
      factId: row[0],
      field: row[1],
      value: JSON.parse(row[2] as string),
      unit: row[3],
      confidence: row[4],
      validFrom: row[5],
    }));
  }

  /**
   * SPEC: Get all entities that have facts.
   */
  async getEntities(): Promise<string[]> {
    const db = await this.getDb();
    const rows = db.exec(
      "SELECT DISTINCT entity_id FROM facts WHERE valid_to IS NULL"
    );
    if (!rows.length) return [];
    return rows[0].values.map((row: any[]) => row[0] as string);
  }

  /**
   * SPEC: Get recent change events.
   */
  async getRecentChanges(limit = 20) {
    const db = await this.getDb();
    const rows = db.exec(
      `SELECT * FROM change_events ORDER BY detected_at DESC LIMIT ?`,
      [limit]
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
