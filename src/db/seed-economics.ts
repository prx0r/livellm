/**
 * SPEC: Seed known economics data.
 * Uses canonical fact schema — no bypassing.
 */

import { openDb, saveDb } from "../db/open.js";
import crypto from "node:crypto";

export async function seedEconomics(dbPath?: string): Promise<void> {
  const db = await openDb(dbPath);
  const now = new Date().toISOString();

  // Create source observation
  db.run(
    `INSERT INTO sources (source_id, url, canonical_url, kind, authority, poll_strategy)
     VALUES ('seed-source', 'https://dev.opencode.ai/docs/go', 'https://dev.opencode.ai/docs/go', 'official', 'opencode.ai', 'manual')`
  );
  db.run(
    `INSERT INTO source_observations (observation_id, source_id, observed_at, http_status, changed)
     VALUES ('seed-observation', 'seed-source', ?, 200, 0)`,
    [now]
  );

  const models = [
    // OpenCode Go subscription models
    {
      entity: "OpenCode:MiMo V2.5",
      input: 0.14, cached: 0.0028, output: 0.28,
      subscription: 10, usageValue: 60, requests: 150400,
      workload: { input: 830, cached: 71500, output: 295 },
    },
    {
      entity: "OpenCode:Hy3",
      input: 0.14, cached: 0.035, output: 0.58,
      subscription: 10, usageValue: 60, requests: 21500,
      workload: { input: 830, cached: 71500, output: 295 },
    },
    {
      entity: "OpenCode:Kimi K2.7",
      input: 0.95, cached: 0.19, output: 4,
      subscription: 10, usageValue: 60, requests: 6750,
      workload: { input: 870, cached: 55000, output: 200 },
    },
    {
      entity: "OpenCode:GLM-5.3-Flash",
      input: 0.15, cached: 0.03, output: 0.5,
      subscription: 10, usageValue: 30, requests: 15800,
      workload: { input: 1000, cached: 55000, output: 200 },
      promoMultiplier: 2, promoEndAt: "2026-09-09T16:00:00Z",
    },
    {
      entity: "OpenCode:GLM-5.3",
      input: 1.4, cached: 0.26, output: 4.4,
      subscription: 10, usageValue: 15, requests: 1080,
      workload: { input: 700, cached: 52000, output: 150 },
    },
    {
      entity: "OpenCode:GPT 5.6 Luna",
      input: 0.2, cached: 0.02, output: 1.2,
      subscription: 10, usageValue: 15, requests: 10250,
      workload: { input: 1000, cached: 50000, output: 220 },
    },
    {
      entity: "OpenCode:DeepSeek V4 Flash",
      input: 0.22, cached: 0.007, output: 0.66,
      subscription: 10, usageValue: 30, requests: 37800,
      workload: { input: 410, cached: 71300, output: 310 },
    },
    {
      entity: "OpenCode:Muse Spark 1.2",
      input: 0.1, cached: 0.002, output: 0.2,
      subscription: 10, usageValue: 60, requests: 226600,
      workload: { input: 620, cached: 71400, output: 300 },
    },
  ];

  for (const m of models) {
    const fields: [string, any, string][] = [
      ["input_price_usd_per_million", m.input, "USD/1M tokens"],
      ["cached_input_price_usd_per_million", m.cached, "USD/1M tokens"],
      ["output_price_usd_per_million", m.output, "USD/1M tokens"],
      ["subscription_price_usd_month", m.subscription, "USD/month"],
      ["usage_value_usd_month", m.usageValue, "USD/month"],
      ["request_limit_month", m.requests, "requests/month"],
      ["input_tokens_per_request", m.workload.input, "tokens"],
      ["cached_tokens_per_request", m.workload.cached, "tokens"],
      ["output_tokens_per_request", m.workload.output, "tokens"],
    ];

    if (m.promoMultiplier) {
      fields.push(["promotion_type", "usage_multiplier", "type"]);
      fields.push(["promotion_multiplier", m.promoMultiplier, "x"]);
    }
    if (m.promoEndAt) {
      fields.push(["promotion_end_at", m.promoEndAt, "ISO date"]);
    }

    for (const [field, value, unit] of fields) {
      const factId = crypto.randomUUID();
      const evidenceId = crypto.randomUUID();

      db.run(
        `INSERT OR IGNORE INTO evidence (evidence_id, observation_id, field, quote_text, evidence_hash)
         VALUES (?, 'seed-observation', ?, ?, ?)`,
        [evidenceId, field, `${m.entity} ${field} = ${value}`, crypto.createHash("sha256").update(String(value)).digest("hex")]
      );

      db.run(
        `INSERT OR IGNORE INTO facts (fact_id, entity_id, field, value_json, unit, evidence_id, valid_from, confidence, verification_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0.98, 'verified')`,
        [factId, m.entity, field, JSON.stringify(value), unit, evidenceId, now]
      );
    }
  }

  saveDb();
  console.log(`Seeded economics for ${models.length} models`);
}
