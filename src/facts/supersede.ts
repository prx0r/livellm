/**
 * SPEC: Temporal fact supersession.
 *
 * When a new validated fact arrives for an entity+field:
 * 1. Close the current active fact (set valid_to)
 * 2. Insert the new fact (valid_from = now, valid_to = null)
 * 3. Create a change_event if the value actually changed
 *
 * Only supersede when the new value differs from the current.
 * Re-asserting the same value does not create a change event.
 */

import { openDb, saveDb } from "../db/open.js";
import crypto from "node:crypto";
import type { ProposedFact } from "./schema.js";

export type SupersedeResult = {
  factId: string;
  changed: boolean;
  beforeValue?: string;
  afterValue?: string;
};

/**
 * SPEC: Apply a validated fact to the ledger.
 * Returns whether a change event was created.
 */
export async function supersedeFact(
  fact: ProposedFact,
  evidenceId: string,
  dbPath?: string
): Promise<SupersedeResult> {
  const db = await openDb(dbPath);
  const now = new Date().toISOString();

  // Find current active fact
  const existing = db.exec(
    `SELECT fact_id, value_json, unit
     FROM facts
     WHERE entity_id = ? AND field = ? AND valid_to IS NULL`,
    [fact.entity, fact.field]
  );

  const newFactId = crypto.randomUUID();

  if (existing.length && existing[0].values.length) {
    const [factId, valueJson] = existing[0].values[0] as [string, string];
    const currentValue = JSON.parse(valueJson);

    // Normalize the new value
    const newValue =
      typeof fact.value === "number"
        ? fact.value
        : JSON.parse(JSON.stringify(fact.value));

    // If same value, don't supersede
    if (JSON.stringify(currentValue) === JSON.stringify(newValue)) {
      return { factId, changed: false };
    }

    // Close the old fact
    db.run(
      "UPDATE facts SET valid_to = ? WHERE fact_id = ?",
      [now, factId]
    );

    // Create change event
    const changeEventId = crypto.randomUUID();
    db.run(
      `INSERT INTO change_events
        (change_event_id, entity_id, event_type, field, before_json, after_json, evidence_id, occurred_at, detected_at)
       VALUES (?, ?, 'fact_changed', ?, ?, ?, ?, ?, ?)`,
      [
        changeEventId,
        fact.entity,
        fact.field,
        valueJson,
        JSON.stringify(newValue),
        evidenceId,
        now,
        now,
      ]
    );

    // Insert new fact
    db.run(
      `INSERT INTO facts
        (fact_id, entity_id, field, value_json, unit, evidence_id, valid_from, confidence, verification_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verified')`,
      [
        newFactId,
        fact.entity,
        fact.field,
        JSON.stringify(newValue),
        fact.unit,
        evidenceId,
        now,
        fact.confidence,
      ]
    );

    saveDb();

    return {
      factId: newFactId,
      changed: true,
      beforeValue: valueJson,
      afterValue: JSON.stringify(newValue),
    };
  }

  // No existing fact — just insert
  db.run(
    `INSERT INTO facts
      (fact_id, entity_id, field, value_json, unit, evidence_id, valid_from, confidence, verification_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verified')`,
    [
      newFactId,
      fact.entity,
      fact.field,
      JSON.stringify(fact.value),
      fact.unit,
      evidenceId,
      now,
      fact.confidence,
    ]
  );

  saveDb();

  return {
    factId: newFactId,
    changed: true,
    afterValue: JSON.stringify(fact.value),
  };
}

/**
 * SPEC: Get all current (active) facts for an entity.
 */
export async function getCurrentFacts(
  entityId: string,
  dbPath?: string
): Promise<Array<{ field: string; value: unknown; unit: string | null; factId: string }>> {
  const db = await openDb(dbPath);
  const rows = db.exec(
    `SELECT fact_id, field, value_json, unit
     FROM facts
     WHERE entity_id = ? AND valid_to IS NULL`,
    [entityId]
  );

  if (!rows.length) return [];

  return rows[0].values.map(([factId, field, valueJson, unit]) => ({
    factId: factId as string,
    field: field as string,
    value: JSON.parse(valueJson as string),
    unit: unit as string | null,
  }));
}

/**
 * SPEC: Get the current value for a specific field.
 */
export async function getCurrentValue(
  entityId: string,
  field: string,
  dbPath?: string
): Promise<{ value: unknown; unit: string | null } | null> {
  const facts = await getCurrentFacts(entityId, dbPath);
  const fact = facts.find((f) => f.field === field);
  return fact ? { value: fact.value, unit: fact.unit } : null;
}
