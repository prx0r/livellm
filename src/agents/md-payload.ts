/**
 * SPEC: Markdown payload for agent consumption.
 *
 * This generates a concise, token-efficient Markdown document
 * that agents can ingest to understand the current LLM market.
 *
 * Designed for:
 * - System prompts
 * - RAG context
 * - Tool outputs
 * - Agent memory
 */

import { materializeState } from "../facts/materialize.js";
import { FactRepo } from "../db/facts.js";

export type MdPayloadOptions = {
  includeEvidence?: boolean;
  includeChanges?: boolean;
  maxModels?: number;
  format?: "compact" | "full" | "json";
};

/**
 * SPEC: Generate compact MD payload for agents.
 *
 * Token budget: ~500 tokens for 10 models (compact)
 */
export async function generateMdPayload(
  dbPath?: string,
  options: MdPayloadOptions = {}
): Promise<string> {
  const state = await materializeState(dbPath);
  const factRepo = new FactRepo();
  const {
    includeEvidence = false,
    includeChanges = true,
    maxModels = 20,
    format = "compact",
  } = options;

  if (format === "json") {
    return JSON.stringify(state, null, 2);
  }

  const lines: string[] = [];

  // Header
  lines.push("# LLM Market Data");
  lines.push(`Updated: ${state.generated_at.split("T")[0]}`);
  lines.push("");

  // Summary table
  lines.push("## Models");
  lines.push("| Provider | Model | Input/1M | Output/1M | Free | Requests |");
  lines.push("|----------|-------|----------|-----------|------|----------|");

  for (const m of state.models.slice(0, maxModels)) {
    const model = m as any;
    const input = model.pricing.input_per_1m ? `$${model.pricing.input_per_1m}` : "—";
    const output = model.pricing.output_per_1m ? `$${model.pricing.output_per_1m}` : "—";
    const free = model.free_tier ? `${model.free_tier.quota}` : "—";
    const rpd = model.limits?.requests_per_day ? `${model.limits.requests_per_day}` : "—";

    lines.push(`| ${model.provider} | ${model.name} | ${input} | ${output} | ${free} | ${rpd} |`);
  }

  lines.push("");

  // Evidence (optional)
  if (includeEvidence) {
    lines.push("## Sources");
    for (const m of state.models.slice(0, maxModels)) {
      const model = m as any;
      if (model.evidence) {
        lines.push(`- ${model.provider}/${model.name}: "${model.evidence.slice(0, 120)}"`);
      }
    }
    lines.push("");
  }

  // Recent changes
  if (includeChanges) {
    const changes = await factRepo.getRecentChanges(10);
    if (changes.length > 0) {
      lines.push("## Recent Changes");
      for (const c of changes.slice(0, 5)) {
        lines.push(`- ${c.entity_id} ${c.field}: ${c.before_json} → ${c.after_json}`);
      }
      lines.push("");
    }
  }

  // Stats
  lines.push(`---`);
  lines.push(`_${state.stats.total_entities} models tracked | ${state.stats.total_facts} facts | ${state.stats.total_changes} changes_`);

  return lines.join("\n");
}

/**
 * SPEC: Generate single-line summary for system prompts.
 * Ultra-compact: ~50 tokens for 5 models.
 */
export async function generateCompactSummary(dbPath?: string): Promise<string> {
  const state = await materializeState(dbPath);
  const top5 = state.models.slice(0, 5);

  const parts = top5.map((m) => {
    const price = m.pricing.input_per_1m
      ? `$${m.pricing.input_per_1m}/1M`
      : m.pricing.monthly
      ? `$${m.pricing.monthly}/mo`
      : "?";
    return `${m.provider} ${m.name}: ${price}`;
  });

  return `LLM Market (${state.generated_at.split("T")[0]}): ${parts.join(" | ")}`;
}

/**
 * SPEC: Generate JSON tool output for structured agent consumption.
 */
export async function generateToolOutput(dbPath?: string): Promise<object> {
  const state = await materializeState(dbPath);

  return {
    type: "llm_market_data",
    generated_at: state.generated_at,
    stats: state.stats,
    models: state.models.map((m) => ({
      id: m.id,
      provider: m.provider,
      name: m.name,
      pricing: m.pricing,
      free_tier: m.free_tier,
      limits: m.limits,
      last_changed: m.last_changed_at,
    })),
  };
}
