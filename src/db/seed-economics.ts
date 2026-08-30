/**
 * SPEC: Seed known economics data for demo purposes.
 * This populates the fact ledger with known pricing data
 * so the economics engine can demonstrate calculations.
 */

import { openDb, saveDb } from "../db/open.js";
import crypto from "node:crypto";

export async function seedEconomics(dbPath?: string): Promise<void> {
  const db = await openDb(dbPath);
  const now = new Date().toISOString();

  // Create a dummy source observation for evidence FK
  // Use exec for multi-statement
  db.run(`INSERT INTO sources (source_id, url, canonical_url, kind, authority, poll_strategy)
     VALUES ('seed-source', 'https://seed.local', 'https://seed.local', 'seed', 'seed', 'manual')`);
  db.run(`INSERT INTO source_observations (observation_id, source_id, observed_at, http_status, changed)
     VALUES ('seed-observation', 'seed-source', '${now}', 200, 0)`);

  const models = [
    // OpenCode Go models
    { entity: "OpenCode:MiMo V2.5", input: 0.14, cached: 0.0028, output: 0.28, monthly: 10, requests: 150400, providerUsage: 60 },
    { entity: "OpenCode:Hy3", input: 0.14, cached: 0.035, output: 0.58, monthly: 10, requests: 21500, providerUsage: 60 },
    { entity: "OpenCode:Kimi K2.7", input: 0.95, cached: 0.19, output: 4, monthly: 10, requests: 6750, providerUsage: 60 },
    { entity: "OpenCode:GLM-5.3-Flash", input: 0.15, cached: 0.03, output: 0.5, monthly: 10, requests: 7900, providerUsage: 15 },
    { entity: "OpenCode:GLM-5.3", input: 1.4, cached: 0.26, output: 4.4, monthly: 10, requests: 1080, providerUsage: 15 },
    { entity: "OpenCode:GPT 5.6 Luna", input: 0.2, cached: 0.02, output: 1.2, monthly: 10, requests: 10250, providerUsage: 15 },
    { entity: "OpenCode:DeepSeek V4 Flash", input: 0.22, cached: 0.007, output: 0.66, monthly: 10, requests: 37800, providerUsage: 30 },
    { entity: "OpenCode:Muse Spark 1.2", input: 0.1, cached: 0.002, output: 0.2, monthly: 10, requests: 226600, providerUsage: 60 },
    // Z.ai direct — 50% OFF until Sept 9, 2026
    { entity: "Z.ai:GLM-5.3-Flash", input: 0.075, cached: 0.015, output: 0.25, monthly: 0, requests: 0, providerUsage: 0 },
    // OpenRouter — matches z.ai promo price
    { entity: "OpenRouter:GLM-5.3-Flash", input: 0.075, cached: 0.015, output: 0.25, monthly: 0, requests: 0, providerUsage: 0 },
  ];

  for (const m of models) {
    const fields = [
      ["input_price_usd_per_million", m.input, "USD/1M tokens"],
      ["cached_input_price_usd_per_million", m.cached, "USD/1M tokens"],
      ["output_price_usd_per_million", m.output, "USD/1M tokens"],
      ["monthly_price_usd", m.monthly, "USD/month"],
      ["requests_per_month", m.requests, "requests/month"],
      ["provider_usage_usd", m.providerUsage, "USD/month"],
    ];

    for (const [field, value, unit] of fields) {
      const factId = crypto.randomUUID();
      const evidenceId = crypto.randomUUID();

      // Create evidence
      db.run(
        `INSERT OR IGNORE INTO evidence (evidence_id, observation_id, field, quote_text, evidence_hash)
         VALUES (?, 'seed-observation', ?, ?, ?)`,
        [evidenceId, field, `${m.entity} ${field} = ${value}`, crypto.createHash("sha256").update(String(value)).digest("hex")]
      );

      // Create fact
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
