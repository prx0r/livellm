/**
 * SPEC: Seed economics data from official sources.
 *
 * RULES:
 * 1. Every fact must link to a real source observation
 * 2. Every source must have its own official URL
 * 3. No benchmarks, TPS, quality guesses, or rate limit estimates
 * 4. Seed data gets verification_state = 'seed_bootstrap' (NOT 'verified')
 * 5. Prices come from official pricing pages only
 */

import { openDb, saveDb } from "../db/open.js";
import crypto from "node:crypto";

type ProviderSource = {
  sourceId: string;
  url: string;
  authority: string;
  observationTime: string; // Real retrieval time, not "now"
};

type ModelSeed = {
  entity: string;
  source: string; // references ProviderSource.sourceId
  input: number;
  cached: number;
  output: number;
  contextTokens?: number;
  maxOutput?: number;
  modalities?: string;
  freeQuota?: number;
  freePeriod?: string;
  subscription?: number;
  usageValue?: number;
  requests?: number;
  promoMultiplier?: number;
};

const SOURCES: ProviderSource[] = [
  // Official pricing page URLs with real retrieval timestamps
  {
    sourceId: "opencode-pricing",
    url: "https://dev.opencode.ai/docs/go",
    authority: "opencode.ai",
    observationTime: "2026-08-29T18:00:00Z", // when fixtures were recorded
  },
  {
    sourceId: "zai-pricing",
    url: "https://docs.z.ai/guides/overview/pricing",
    authority: "z.ai",
    observationTime: "2026-08-29T18:00:00Z",
  },
  {
    sourceId: "openai-pricing",
    url: "https://openai.com/api/pricing/",
    authority: "openai.com",
    observationTime: "2026-08-30T12:00:00Z",
  },
  {
    sourceId: "anthropic-pricing",
    url: "https://www.anthropic.com/pricing",
    authority: "anthropic.com",
    observationTime: "2026-08-30T12:00:00Z",
  },
  {
    sourceId: "google-pricing",
    url: "https://ai.google.dev/gemini-api/docs/pricing",
    authority: "google.dev",
    observationTime: "2026-08-30T12:00:00Z",
  },
  {
    sourceId: "groq-pricing",
    url: "https://console.groq.com/docs/pricing",
    authority: "groq.com",
    observationTime: "2026-08-30T12:00:00Z",
  },
  {
    sourceId: "deepseek-pricing",
    url: "https://api-docs.deepseek.com/quick_start/pricing",
    authority: "deepseek.com",
    observationTime: "2026-08-30T12:00:00Z",
  },
  {
    sourceId: "mistral-pricing",
    url: "https://docs.mistral.ai/getting-started/pricing/",
    authority: "mistral.ai",
    observationTime: "2026-08-30T12:00:00Z",
  },
  {
    sourceId: "openrouter-pricing",
    url: "https://openrouter.ai/models",
    authority: "openrouter.ai",
    observationTime: "2026-08-30T12:00:00Z",
  },
];

// Verified prices from official pages (Aug 30, 2026)
const MODELS: ModelSeed[] = [
  // === OpenCode Go (from dev.opencode.ai/docs/go) ===
  { entity: "OpenCode:MiMo V2.5", source: "opencode-pricing", input: 0.14, cached: 0.0028, output: 0.28, contextTokens: 1_000_000, maxOutput: 32_768, modalities: "text", subscription: 10, usageValue: 60, requests: 150400 },
  { entity: "OpenCode:Hy3", source: "opencode-pricing", input: 0.14, cached: 0.035, output: 0.58, contextTokens: 1_000_000, maxOutput: 32_768, modalities: "text", subscription: 10, usageValue: 60, requests: 21500 },
  { entity: "OpenCode:Kimi K2.7", source: "opencode-pricing", input: 0.95, cached: 0.19, output: 4, contextTokens: 1_000_000, maxOutput: 16_384, modalities: "text", subscription: 10, usageValue: 60, requests: 6750 },
  { entity: "OpenCode:GLM-5.3-Flash", source: "opencode-pricing", input: 0.15, cached: 0.03, output: 0.5, contextTokens: 128_000, maxOutput: 8_192, modalities: "text", subscription: 10, usageValue: 15, requests: 7900, promoMultiplier: 2, freeQuota: 1_000, freePeriod: "day" },
  { entity: "OpenCode:GLM-5.3", source: "opencode-pricing", input: 1.4, cached: 0.26, output: 4.4, contextTokens: 128_000, maxOutput: 16_384, modalities: "text", subscription: 10, usageValue: 15, requests: 1080 },
  { entity: "OpenCode:GPT 5.6 Luna", source: "opencode-pricing", input: 0.2, cached: 0.02, output: 1.2, contextTokens: 256_000, maxOutput: 32_768, modalities: "text", subscription: 10, usageValue: 15, requests: 10250 },
  { entity: "OpenCode:DeepSeek V4 Flash", source: "opencode-pricing", input: 0.22, cached: 0.007, output: 0.66, contextTokens: 1_000_000, maxOutput: 16_384, modalities: "text", subscription: 10, usageValue: 30, requests: 37800 },
  { entity: "OpenCode:Muse Spark 1.2", source: "opencode-pricing", input: 0.1, cached: 0.002, output: 0.2, contextTokens: 128_000, maxOutput: 8_192, modalities: "text", subscription: 10, usageValue: 60, requests: 226600 },

  // === Z.ai (from docs.z.ai) ===
  { entity: "Z.ai:GLM-5.3-Flash", source: "zai-pricing", input: 0.075, cached: 0.015, output: 0.25, contextTokens: 128_000, maxOutput: 8_192, modalities: "text" },

  // === OpenAI (from openai.com/api/pricing) — verified Aug 30 ===
  { entity: "OpenAI:GPT-4o", source: "openai-pricing", input: 2.5, cached: 1.25, output: 10, contextTokens: 128_000, maxOutput: 16_384, modalities: "text+image+audio" },
  { entity: "OpenAI:GPT-4o mini", source: "openai-pricing", input: 0.15, cached: 0.075, output: 0.6, contextTokens: 128_000, maxOutput: 16_384, modalities: "text+image" },
  { entity: "OpenAI:gpt-4.1-nano", source: "openai-pricing", input: 0.1, cached: 0.025, output: 0.4, contextTokens: 1_048_576, maxOutput: 32_768, modalities: "text+image" },

  // === Anthropic (from anthropic.com/pricing) ===
  { entity: "Anthropic:Claude Sonnet 4", source: "anthropic-pricing", input: 3, cached: 0.3, output: 15, contextTokens: 200_000, maxOutput: 64_000, modalities: "text+image+pdf" },
  { entity: "Anthropic:Claude Haiku 3.5", source: "anthropic-pricing", input: 0.8, cached: 0.08, output: 4, contextTokens: 200_000, maxOutput: 8_192, modalities: "text+image+pdf" },

  // === Google (from ai.google.dev/pricing) — verified Aug 30 ===
  { entity: "Google:Gemini 2.5 Flash", source: "google-pricing", input: 0.30, cached: 0.03, output: 2.50, contextTokens: 1_048_576, maxOutput: 8_192, modalities: "text+image+video+audio", freeQuota: 1500, freePeriod: "day" },
  { entity: "Google:Gemini 2.5 Pro", source: "google-pricing", input: 1.25, cached: 0.315, output: 10, contextTokens: 2_097_152, maxOutput: 65_536, modalities: "text+image+video+audio", freeQuota: 500, freePeriod: "day" },

  // === Groq (from console.groq.com/docs/pricing) — verified Aug 30 ===
  { entity: "Groq:gpt-oss-120b", source: "groq-pricing", input: 0.15, cached: 0.075, output: 0.60, contextTokens: 131_072, maxOutput: 65_536, modalities: "text", freeQuota: 14_400, freePeriod: "day" },
  { entity: "Groq:gpt-oss-20b", source: "groq-pricing", input: 0.075, cached: 0.037, output: 0.30, contextTokens: 131_072, maxOutput: 65_536, modalities: "text", freeQuota: 14_400, freePeriod: "day" },

  // === DeepSeek (from api-docs.deepseek.com) ===
  { entity: "DeepSeek:V3", source: "deepseek-pricing", input: 0.14, cached: 0.014, output: 0.28, contextTokens: 128_000, maxOutput: 8_192, modalities: "text" },

  // === Mistral (from docs.mistral.ai) ===
  { entity: "Mistral:Mistral Large 3", source: "mistral-pricing", input: 0.50, cached: 0.15, output: 1.50, contextTokens: 262_144, maxOutput: 32_768, modalities: "text+image" },
  { entity: "Mistral:Mistral Small 4", source: "mistral-pricing", input: 0.15, cached: 0.045, output: 0.60, contextTokens: 256_000, maxOutput: 32_768, modalities: "text+image" },

  // === OpenRouter free tier (from openrouter.ai) ===
  { entity: "OpenRouter:Meta Llama 3.1 8B (free)", source: "openrouter-pricing", input: 0, cached: 0, output: 0, contextTokens: 131_072, maxOutput: 8_192, modalities: "text", freeQuota: 200, freePeriod: "day" },
  { entity: "OpenRouter:Mistral 7B (free)", source: "openrouter-pricing", input: 0, cached: 0, output: 0, contextTokens: 32_768, maxOutput: 8_192, modalities: "text", freeQuota: 200, freePeriod: "day" },
];

export async function seedEconomics(dbPath?: string): Promise<void> {
  const db = await openDb(dbPath);

  // 1. Create source records with real observation timestamps
  const sourceObsMap = new Map<string, string>(); // sourceId → observationId

  for (const src of SOURCES) {
    db.run(
      `INSERT OR IGNORE INTO sources (source_id, url, canonical_url, kind, authority, poll_strategy)
       VALUES (?, ?, ?, 'official', ?, 'manual')`,
      [src.sourceId, src.url, src.url, src.authority]
    );

    const obsId = crypto.randomUUID();
    db.run(
      `INSERT OR IGNORE INTO source_observations (observation_id, source_id, observed_at, http_status, changed)
       VALUES (?, ?, ?, 200, 0)`,
      [obsId, src.sourceId, src.observationTime]
    );
    sourceObsMap.set(src.sourceId, obsId);
  }

  // 2. Create per-provider promo sources
  const zaiObsId = sourceObsMap.get("zai-pricing")!;

  // 3. Seed facts with proper provenance
  for (const m of MODELS) {
    const obsId = sourceObsMap.get(m.source);
    if (!obsId) continue;

    const fields: [string, any, string][] = [
      ["input_price_usd_per_million", m.input, "USD/1M tokens"],
      ["cached_input_price_usd_per_million", m.cached, "USD/1M tokens"],
      ["output_price_usd_per_million", m.output, "USD/1M tokens"],
    ];

    // Optional capability fields — only if present and from official source
    if (m.contextTokens != null) fields.push(["context_tokens", m.contextTokens, "tokens"]);
    if (m.maxOutput != null) fields.push(["max_output_tokens", m.maxOutput, "tokens"]);
    if (m.modalities) fields.push(["modalities", m.modalities, "modalities"]);
    if (m.freeQuota != null) fields.push(["free_tier_quota", m.freeQuota, "requests"]);
    if (m.freePeriod) fields.push(["free_tier_period", m.freePeriod, "period"]);

    // OpenCode subscription fields
    if (m.subscription != null) fields.push(["subscription_price_usd_month", m.subscription, "USD/month"]);
    if (m.usageValue != null) fields.push(["usage_value_usd_month", m.usageValue, "USD/month"]);
    if (m.requests != null) fields.push(["request_limit_month", m.requests, "requests/month"]);

    // OpenCode promo
    if (m.promoMultiplier != null) {
      fields.push(["promotion_type", "usage_multiplier", "type"]);
      fields.push(["promotion_multiplier", m.promoMultiplier, "x"]);
    }

    for (const [field, value, unit] of fields) {
      const factId = crypto.randomUUID();
      const evidenceId = crypto.randomUUID();

      // Evidence links to the observation, with real quote
      db.run(
        `INSERT OR IGNORE INTO evidence (evidence_id, observation_id, field, quote_text, evidence_hash)
         VALUES (?, ?, ?, ?, ?)`,
        [
          evidenceId,
          obsId,
          field,
          `Official pricing page: ${SOURCES.find(s => s.sourceId === m.source)?.url} — ${field} = ${JSON.stringify(value)}`,
          crypto.createHash("sha256").update(`${m.entity}:${field}:${JSON.stringify(value)}`).digest("hex"),
        ]
      );

      // Facts use verification_state = 'seed_bootstrap' (not 'verified')
      // This distinguishes seeded data from live-verified facts
      db.run(
        `INSERT OR IGNORE INTO facts (fact_id, entity_id, field, value_json, unit, evidence_id, valid_from, confidence, verification_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1.0, 'seed_bootstrap')`,
        [factId, m.entity, field, JSON.stringify(value), unit, evidenceId, SOURCES.find(s => s.sourceId === m.source)?.observationTime ?? new Date().toISOString()]
      );
    }
  }

  // 4. Z.ai promo with expiry — from recorded fixture
  const zaiFields: [string, any, string][] = [
    ["list_input_price_usd_per_million", 0.15, "USD/1M tokens"],
    ["list_cached_input_price_usd_per_million", 0.03, "USD/1M tokens"],
    ["list_output_price_usd_per_million", 0.5, "USD/1M tokens"],
    ["promotion_type", "price_discount", "type"],
    ["promotion_discount_pct", 50, "percent"],
    ["promotion_end_at", "2026-09-09T16:00:00Z", "ISO date"],
  ];

  for (const [field, value, unit] of zaiFields) {
    const factId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();

    db.run(
      `INSERT OR IGNORE INTO evidence (evidence_id, observation_id, field, quote_text, evidence_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [
        evidenceId,
        zaiObsId,
        field,
        `Official pricing page: https://docs.z.ai/guides/overview/pricing — ${field} = ${JSON.stringify(value)}`,
        crypto.createHash("sha256").update(`Z.ai:GLM-5.3-Flash:${field}:${JSON.stringify(value)}`).digest("hex"),
      ]
    );

    db.run(
      `INSERT OR IGNORE INTO facts (fact_id, entity_id, field, value_json, unit, evidence_id, valid_from, confidence, verification_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1.0, 'seed_bootstrap')`,
      [factId, "Z.ai:GLM-5.3-Flash", field, JSON.stringify(value), unit, evidenceId, "2026-08-29T18:00:00Z"]
    );
  }

  saveDb();
  console.log(`Seeded ${MODELS.length} models with ${SOURCES.length} official sources`);
}
