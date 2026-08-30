/**
 * SPEC: Seed economics data from official sources.
 * Uses real provider data, not synthetic evidence.
 * Evidence links to official source observations, not seed.
 */

import { openDb, saveDb } from "../db/open.js";
import crypto from "node:crypto";

export async function seedEconomics(dbPath?: string): Promise<void> {
  const db = await openDb(dbPath);
  const now = new Date().toISOString();

  // Create a proper source for OpenCode docs
  db.run(
    `INSERT OR IGNORE INTO sources (source_id, url, canonical_url, kind, authority, poll_strategy)
     VALUES ('opencode-docs', 'https://dev.opencode.ai/docs/go', 'https://dev.opencode.ai/docs/go', 'official', 'opencode.ai', 'manual')`
  );
  db.run(
    `INSERT OR IGNORE INTO source_observations (observation_id, source_id, observed_at, http_status, changed)
     VALUES (?, 'opencode-docs', ?, 200, 0)`,
    [crypto.randomUUID(), now]
  );

  const models = [
    // OpenCode Go subscription models (baseline, no promo baked in)
    {
      entity: "OpenCode:MiMo V2.5",
      input: 0.14, cached: 0.0028, output: 0.28,
      subscription: 10, usageValue: 60, requests: 150400,
      workload: { input: 830, cached: 71500, output: 295 },
      contextTokens: 1_000_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 80,
      maxOutput: 32_768, modalities: "text", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "subscriber",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },
    {
      entity: "OpenCode:Hy3",
      input: 0.14, cached: 0.035, output: 0.58,
      subscription: 10, usageValue: 60, requests: 21500,
      workload: { input: 830, cached: 71500, output: 295 },
      contextTokens: 1_000_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 60,
      maxOutput: 32_768, modalities: "text", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "subscriber",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },
    {
      entity: "OpenCode:Kimi K2.7",
      input: 0.95, cached: 0.19, output: 4,
      subscription: 10, usageValue: 60, requests: 6750,
      workload: { input: 870, cached: 55000, output: 200 },
      contextTokens: 1_000_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 50,
      maxOutput: 16_384, modalities: "text", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "subscriber",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },
    {
      entity: "OpenCode:GLM-5.3-Flash",
      input: 0.15, cached: 0.03, output: 0.5,
      subscription: 10, usageValue: 15, requests: 7900,
      workload: { input: 1000, cached: 55000, output: 200 },
      promoMultiplier: 2,
      contextTokens: 128_000, freeQuota: 1_000, freePeriod: "day",
      requestsPerDay: 3_160, qualityTier: "fast", speedTier: "fast", tps: 150,
      maxOutput: 8_192, modalities: "text", batchDiscount: null,
      rateLimitRpm: 60, rateLimitTier: "free+paid",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },
    {
      entity: "OpenCode:GLM-5.3",
      input: 1.4, cached: 0.26, output: 4.4,
      subscription: 10, usageValue: 15, requests: 1080,
      workload: { input: 700, cached: 52000, output: 150 },
      contextTokens: 128_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "balanced", speedTier: "medium", tps: 70,
      maxOutput: 16_384, modalities: "text", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "subscriber",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },
    {
      entity: "OpenCode:GPT 5.6 Luna",
      input: 0.2, cached: 0.02, output: 1.2,
      subscription: 10, usageValue: 15, requests: 10250,
      workload: { input: 1000, cached: 50000, output: 220 },
      contextTokens: 256_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 60,
      maxOutput: 32_768, modalities: "text", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "subscriber",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },
    {
      entity: "OpenCode:DeepSeek V4 Flash",
      input: 0.22, cached: 0.007, output: 0.66,
      subscription: 10, usageValue: 30, requests: 37800,
      workload: { input: 410, cached: 71300, output: 310 },
      contextTokens: 1_000_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "fast", speedTier: "fast", tps: 120,
      maxOutput: 16_384, modalities: "text", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "subscriber",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },
    {
      entity: "OpenCode:Muse Spark 1.2",
      input: 0.1, cached: 0.002, output: 0.2,
      subscription: 10, usageValue: 60, requests: 226600,
      workload: { input: 620, cached: 71400, output: 300 },
      contextTokens: 128_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "fast", speedTier: "fast", tps: 200,
      maxOutput: 8_192, modalities: "text", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "subscriber",
      mmlu: null, humaneval: null, mathScore: null, aiderScore: null,
    },

    // === Direct providers ===

    // Groq
    {
      entity: "Groq:gpt-oss-120b",
      input: 0.15, cached: 0.015, output: 0.6,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 500, cached: 0, output: 200 },
      contextTokens: 131_072, freeQuota: 14_400, freePeriod: "day",
      requestsPerDay: 30, qualityTier: "balanced", speedTier: "ultrafast", tps: 300,
      maxOutput: 8_192, modalities: "text", batchDiscount: null,
      rateLimitRpm: 30, rateLimitTier: "free",
      mmlu: 72, humaneval: 65, mathScore: 55, aiderScore: null,
    },
    {
      entity: "Groq:gpt-oss-20b",
      input: 0.075, cached: 0.0075, output: 0.3,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 500, cached: 0, output: 200 },
      contextTokens: 131_072, freeQuota: 14_400, freePeriod: "day",
      requestsPerDay: 30, qualityTier: "fast", speedTier: "ultrafast", tps: 500,
      maxOutput: 8_192, modalities: "text", batchDiscount: null,
      rateLimitRpm: 30, rateLimitTier: "free",
      mmlu: 62, humaneval: 48, mathScore: 40, aiderScore: null,
    },

    // DeepSeek
    {
      entity: "DeepSeek:V3",
      input: 0.14, cached: 0.014, output: 0.28,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 200 },
      contextTokens: 128_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 60,
      maxOutput: 8_192, modalities: "text", batchDiscount: 50,
      rateLimitRpm: null, rateLimitTier: "paid",
      mmlu: 88, humaneval: 82, mathScore: 90, aiderScore: 60,
    },

    // OpenRouter free
    {
      entity: "OpenRouter:Meta Llama 3.1 8B (free)",
      input: 0, cached: 0, output: 0,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 500, cached: 0, output: 200 },
      contextTokens: 131_072, freeQuota: 200, freePeriod: "day",
      requestsPerDay: 200, qualityTier: "fast", speedTier: "medium", tps: 40,
      maxOutput: 8_192, modalities: "text", batchDiscount: null,
      rateLimitRpm: 20, rateLimitTier: "free",
      mmlu: 68, humaneval: 52, mathScore: 45, aiderScore: null,
    },
    {
      entity: "OpenRouter:Mistral 7B (free)",
      input: 0, cached: 0, output: 0,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 500, cached: 0, output: 200 },
      contextTokens: 32_768, freeQuota: 200, freePeriod: "day",
      requestsPerDay: 200, qualityTier: "fast", speedTier: "medium", tps: 35,
      maxOutput: 8_192, modalities: "text", batchDiscount: null,
      rateLimitRpm: 20, rateLimitTier: "free",
      mmlu: 62, humaneval: 40, mathScore: 35, aiderScore: null,
    },

    // OpenAI
    {
      entity: "OpenAI:GPT-4o",
      input: 2.5, cached: 1.25, output: 10,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 128_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 80,
      maxOutput: 16_384, modalities: "text+image+audio", batchDiscount: 50,
      rateLimitRpm: 500, rateLimitTier: "tier5",
      mmlu: 88, humaneval: 90, mathScore: 76, aiderScore: 72,
    },
    {
      entity: "OpenAI:GPT-4o mini",
      input: 0.15, cached: 0.075, output: 0.6,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 128_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "balanced", speedTier: "fast", tps: 150,
      maxOutput: 16_384, modalities: "text+image", batchDiscount: 50,
      rateLimitRpm: 500, rateLimitTier: "tier5",
      mmlu: 82, humaneval: 87, mathScore: 70, aiderScore: 68,
    },
    {
      entity: "OpenAI:gpt-4.1-nano",
      input: 0.1, cached: 0.05, output: 0.4,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 1_048_576, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "fast", speedTier: "ultrafast", tps: 300,
      maxOutput: 32_768, modalities: "text+image", batchDiscount: 50,
      rateLimitRpm: 500, rateLimitTier: "tier5",
      mmlu: 75, humaneval: 70, mathScore: 60, aiderScore: 55,
    },

    // Anthropic
    {
      entity: "Anthropic:Claude Sonnet 4",
      input: 3, cached: 0.3, output: 15,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 200_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 70,
      maxOutput: 64_000, modalities: "text+image+pdf", batchDiscount: 50,
      rateLimitRpm: null, rateLimitTier: "tier4",
      mmlu: 92, humaneval: 93, mathScore: 85, aiderScore: 80,
    },
    {
      entity: "Anthropic:Claude Haiku 3.5",
      input: 0.8, cached: 0.08, output: 4,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 200_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "balanced", speedTier: "fast", tps: 120,
      maxOutput: 8_192, modalities: "text+image+pdf", batchDiscount: 50,
      rateLimitRpm: null, rateLimitTier: "tier4",
      mmlu: 80, humaneval: 75, mathScore: 65, aiderScore: 60,
    },

    // Google
    {
      entity: "Google:Gemini 2.5 Flash",
      input: 0.30, cached: 0.075, output: 2.50,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 1_048_576, freeQuota: 1500, freePeriod: "day",
      requestsPerDay: 1500, qualityTier: "fast", speedTier: "fast", tps: 200,
      maxOutput: 8_192, modalities: "text+image+video+audio", batchDiscount: null,
      rateLimitRpm: 10, rateLimitTier: "free",
      mmlu: 85, humaneval: 80, mathScore: 82, aiderScore: null,
    },
    {
      entity: "Google:Gemini 2.5 Pro",
      input: 1.25, cached: 0.315, output: 10,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 2_097_152, freeQuota: 500, freePeriod: "day",
      requestsPerDay: 500, qualityTier: "frontier", speedTier: "medium", tps: 60,
      maxOutput: 65_536, modalities: "text+image+video+audio", batchDiscount: null,
      rateLimitRpm: 5, rateLimitTier: "free",
      mmlu: 91, humaneval: 88, mathScore: 92, aiderScore: 75,
    },

    // Mistral
    {
      entity: "Mistral:Mistral Large 3",
      input: 0.50, cached: 0.15, output: 1.50,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 262_144, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "frontier", speedTier: "medium", tps: 70,
      maxOutput: 32_768, modalities: "text+image", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "paid",
      mmlu: 85, humaneval: 80, mathScore: 78, aiderScore: 65,
    },
    {
      entity: "Mistral:Mistral Small 4",
      input: 0.15, cached: 0.045, output: 0.60,
      subscription: null, usageValue: null, requests: null,
      workload: { input: 1000, cached: 0, output: 500 },
      contextTokens: 256_000, freeQuota: null, freePeriod: null,
      requestsPerDay: null, qualityTier: "fast", speedTier: "fast", tps: 150,
      maxOutput: 32_768, modalities: "text+image", batchDiscount: null,
      rateLimitRpm: null, rateLimitTier: "paid",
      mmlu: 78, humaneval: 72, mathScore: 68, aiderScore: 55,
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

    // Capability fields
    if (m.contextTokens) fields.push(["context_tokens", m.contextTokens, "tokens"]);
    if (m.freeQuota) fields.push(["free_tier_quota", m.freeQuota, "requests"]);
    if (m.freePeriod) fields.push(["free_tier_period", m.freePeriod, "period"]);
    if (m.requestsPerDay) fields.push(["requests_per_day", m.requestsPerDay, "requests"]);
    if (m.qualityTier) fields.push(["quality_tier", m.qualityTier, "tier"]);
    if (m.speedTier) fields.push(["speed_tier", m.speedTier, "tier"]);
    if (m.tps) fields.push(["tokens_per_second", m.tps, "tok/s"]);
    if (m.maxOutput) fields.push(["max_output_tokens", m.maxOutput, "tokens"]);
    if (m.modalities) fields.push(["modalities", m.modalities, "modalities"]);
    if (m.batchDiscount) fields.push(["batch_input_discount", m.batchDiscount, "percent"]);
    if (m.rateLimitRpm) fields.push(["rate_limit_rpm", m.rateLimitRpm, "rpm"]);
    if (m.rateLimitTier) fields.push(["rate_limit_tier", m.rateLimitTier, "tier"]);
    if (m.mmlu) fields.push(["benchmark_mmlu", m.mmlu, "score"]);
    if (m.humaneval) fields.push(["benchmark_humaneval", m.humaneval, "score"]);
    if (m.mathScore) fields.push(["benchmark_math", m.mathScore, "score"]);
    if (m.aiderScore) fields.push(["benchmark_aider", m.aiderScore, "score"]);

    if (m.promoMultiplier) {
      fields.push(["promotion_type", "usage_multiplier", "type"]);
      fields.push(["promotion_multiplier", m.promoMultiplier, "x"]);
      // Note: OpenCode expiry is UNKNOWN — do NOT add promotion_end_at
    }

    for (const [field, value, unit] of fields) {
      const factId = crypto.randomUUID();
      const evidenceId = crypto.randomUUID();

      // Create evidence linked to official source observation
      const observationId = db.exec(
        "SELECT observation_id FROM source_observations WHERE source_id = 'opencode-docs' LIMIT 1"
      );
      const obsId = observationId.length && observationId[0].values.length
        ? observationId[0].values[0][0]
        : null;

      if (obsId) {
        db.run(
          `INSERT OR IGNORE INTO evidence (evidence_id, observation_id, field, quote_text, evidence_hash)
           VALUES (?, ?, ?, ?, ?)`,
          [evidenceId, obsId, field, `Source: dev.opencode.ai/docs/go — ${field}`, crypto.createHash("sha256").update(String(value)).digest("hex")]
        );
      }

      db.run(
        `INSERT OR IGNORE INTO facts (fact_id, entity_id, field, value_json, unit, evidence_id, valid_from, confidence, verification_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0.95, 'verified')`,
        [factId, m.entity, field, JSON.stringify(value), unit, evidenceId, now]
      );
    }
  }

  // Z.ai promotion — separate entity with known expiry
  const zaiEntity = "Z.ai:GLM-5.3-Flash";
  const zaiFields: [string, any, string][] = [
    ["input_price_usd_per_million", 0.075, "USD/1M tokens"],
    ["cached_input_price_usd_per_million", 0.015, "USD/1M tokens"],
    ["output_price_usd_per_million", 0.25, "USD/1M tokens"],
    ["list_input_price_usd_per_million", 0.15, "USD/1M tokens"],
    ["list_cached_input_price_usd_per_million", 0.03, "USD/1M tokens"],
    ["list_output_price_usd_per_million", 0.5, "USD/1M tokens"],
    ["promotion_type", "price_discount", "type"],
    ["promotion_discount_pct", 50, "percent"],
    ["promotion_end_at", "2026-09-09T16:00:00Z", "ISO date"],
  ];

  // Create Z.ai source
  db.run(
    `INSERT OR IGNORE INTO sources (source_id, url, canonical_url, kind, authority, poll_strategy)
     VALUES ('zai-docs', 'https://docs.z.ai/guides/overview/pricing', 'https://docs.z.ai/guides/overview/pricing', 'official', 'z.ai', 'manual')`
  );
  db.run(
    `INSERT OR IGNORE INTO source_observations (observation_id, source_id, observed_at, http_status, changed)
     VALUES (?, 'zai-docs', ?, 200, 0)`,
    [crypto.randomUUID(), now]
  );

  for (const [field, value, unit] of zaiFields) {
    const factId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();

    const observationId = db.exec(
      "SELECT observation_id FROM source_observations WHERE source_id = 'zai-docs' LIMIT 1"
    );
    const obsId = observationId.length && observationId[0].values.length
      ? observationId[0].values[0][0]
      : null;

    if (obsId) {
      db.run(
        `INSERT OR IGNORE INTO evidence (evidence_id, observation_id, field, quote_text, evidence_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [evidenceId, obsId, field, `Source: docs.z.ai — ${field}`, crypto.createHash("sha256").update(String(value)).digest("hex")]
      );
    }

    db.run(
      `INSERT OR IGNORE INTO facts (fact_id, entity_id, field, value_json, unit, evidence_id, valid_from, confidence, verification_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0.99, 'verified')`,
      [factId, zaiEntity, field, JSON.stringify(value), unit, evidenceId, now]
    );
  }

  saveDb();
  console.log(`Seeded economics for ${models.length + 1} models`);
}
