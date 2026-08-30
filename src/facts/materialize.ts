/**
 * SPEC: Materialize current state from fact ledger.
 *
 * This connects LiveLLM's fact ledger to LLMDeals' economics engine.
 * The materialized state is the canonical "current market" view.
 *
 * Output format matches the existing LLMDeals JSON structure:
 * {
 *   "providers": [...],
 *   "models": [...],
 *   "offers": [...],
 *   "generated_at": "..."
 * }
 */

import { openDb, saveDb } from "../db/open.js";

export type MaterializedModel = {
  id: string;
  provider: string;
  name: string;
  pricing: {
    input_per_1m?: number;
    output_per_1m?: number;
    cached_input_per_1m?: number;
    monthly?: number;
  };
  free_tier?: {
    quota?: number;
    period?: string;
  };
  limits?: {
    requests_per_day?: number;
    requests_per_minute?: number;
    context_tokens?: number;
  };
  last_changed_at?: string;
  evidence?: string;
};

/**
 * SPEC: Build the current market snapshot from facts.
 */
export async function materializeState(dbPath?: string): Promise<{
  models: MaterializedModel[];
  generated_at: string;
  stats: {
    total_entities: number;
    total_facts: number;
    total_changes: number;
  };
}> {
  const db = await openDb(dbPath);

  // Get all active facts
  const factsResult = db.exec(
    `SELECT entity_id, field, value_json, unit, valid_from
     FROM facts WHERE valid_to IS NULL
     ORDER BY entity_id, field`
  );

  if (!factsResult.length) {
    return {
      models: [],
      generated_at: new Date().toISOString(),
      stats: { total_entities: 0, total_facts: 0, total_changes: 0 },
    };
  }

  // Group by entity
  const entityMap = new Map<string, Map<string, any>>();

  for (const row of factsResult[0].values) {
    const [entityId, field, valueJson, unit, validFrom] = row as [
      string,
      string,
      string,
      string | null,
      string
    ];

    if (!entityMap.has(entityId)) {
      entityMap.set(entityId, new Map());
    }
    entityMap.get(entityId)!.set(field, {
      value: JSON.parse(valueJson),
      unit,
      validFrom,
    });
  }

  // Build models array
  const models: MaterializedModel[] = [];

  for (const [entityId, fields] of entityMap) {
    const [provider, ...nameParts] = entityId.split(":");
    const name = nameParts.join(":") || provider;

    const model: MaterializedModel = {
      id: entityId,
      provider,
      name,
      pricing: {},
      free_tier: undefined,
      limits: undefined,
    };

    // Map fields to structured output
    const inputPrice = fields.get("input_price_usd_per_million");
    if (inputPrice) {
      model.pricing.input_per_1m = inputPrice.value;
    }

    const outputPrice = fields.get("output_price_usd_per_million");
    if (outputPrice) {
      model.pricing.output_per_1m = outputPrice.value;
    }

    const cachedPrice = fields.get("cached_input_price_usd_per_million");
    if (cachedPrice) {
      model.pricing.cached_input_per_1m = cachedPrice.value;
    }

    const monthlyPrice = fields.get("monthly_price_usd");
    if (monthlyPrice) {
      model.pricing.monthly = monthlyPrice.value;
    }

    const freeQuota = fields.get("free_tier_quota");
    const freePeriod = fields.get("free_tier_period");
    if (freeQuota) {
      model.free_tier = {
        quota: freeQuota.value,
        period: freePeriod?.value ?? undefined,
      };
    }

    const rpd = fields.get("requests_per_day");
    const rpm = fields.get("requests_per_minute");
    const ctx = fields.get("context_tokens");
    if (rpd || rpm || ctx) {
      model.limits = {
        requests_per_day: rpd?.value ?? undefined,
        requests_per_minute: rpm?.value ?? undefined,
        context_tokens: ctx?.value ?? undefined,
      };
    }

    // Get latest change time
    const latestChange = db.exec(
      `SELECT detected_at FROM change_events
       WHERE entity_id = ?
       ORDER BY detected_at DESC LIMIT 1`,
      [entityId]
    );
    if (latestChange.length && latestChange[0].values.length) {
      model.last_changed_at = latestChange[0].values[0][0] as string;
    }

    // Get evidence
    const evidenceResult = db.exec(
      `SELECT e.quote_text FROM evidence e
       JOIN facts f ON f.evidence_id = e.evidence_id
       WHERE f.entity_id = ? AND f.valid_to IS NULL
       LIMIT 1`,
      [entityId]
    );
    if (evidenceResult.length && evidenceResult[0].values.length) {
      model.evidence = evidenceResult[0].values[0][0] as string;
    }

    models.push(model);
  }

  // Stats
  const statsResult = db.exec(
    `SELECT
       COUNT(DISTINCT entity_id) as entities,
       COUNT(*) as facts,
       (SELECT COUNT(*) FROM change_events) as changes
     FROM facts WHERE valid_to IS NULL`
  );

  const stats = {
    total_entities: 0,
    total_facts: 0,
    total_changes: 0,
  };

  if (statsResult.length) {
    stats.total_entities = statsResult[0].values[0][0] as number;
    stats.total_facts = statsResult[0].values[0][1] as number;
    stats.total_changes = statsResult[0].values[0][2] as number;
  }

  return {
    models,
    generated_at: new Date().toISOString(),
    stats,
  };
}
