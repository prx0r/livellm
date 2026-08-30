/**
 * SPEC: MCP Server — exposes LiveLLM as tools for AI agents.
 *
 * Read-only tools (no credit spend):
 * 1. get_market_snapshot — current prices/quotas for all tracked models
 * 2. get_model_details — specific model pricing and facts
 * 3. get_recent_changes — recent price/quota changes
 * 4. get_candidates — unverified discoveries
 * 5. compare_models — side-by-side pricing comparison
 */

import { materializeState } from "../facts/materialize.js";
import { FactRepo } from "../db/facts.js";
import { CandidateRepo } from "../db/candidates.js";
import { runRadar } from "../radar.js";
import { resolve } from "node:path";

const DB_PATH = resolve(process.cwd(), "data", "livellm.db");

type ToolResult = {
  content: Array<{ type: string; text: string }>;
};

/**
 * MCP tool definitions
 */
export const TOOLS = [
  {
    name: "get_market_snapshot",
    description:
      "Get current LLM pricing, quotas, and limits for all tracked models. Returns the live market state.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_model_details",
    description: "Get detailed pricing and facts for a specific model or provider.",
    inputSchema: {
      type: "object" as const,
      properties: {
        provider: { type: "string", description: "Provider name (e.g., OpenAI, Anthropic)" },
        model: { type: "string", description: "Model name (e.g., GPT-4o, Claude)" },
      },
      required: ["provider"],
    },
  },
  {
    name: "get_recent_changes",
    description: "Get recent price/quota changes with before/after values.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  // run_radar removed from default MCP — credits should not be spent by agents
  // Use CLI: livellm radar --mode live
  {
    name: "get_candidates",
    description: "Get unverified pricing discoveries from the radar.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "compare_models",
    description: "Compare pricing across multiple models side-by-side.",
    inputSchema: {
      type: "object" as const,
      properties: {
        models: {
          type: "array",
          items: { type: "string" },
          description: 'Models to compare (e.g., ["OpenAI:GPT-4o", "Anthropic:Claude"])',
        },
      },
      required: ["models"],
    },
  },
];

/**
 * MCP tool handlers
 */
export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case "get_market_snapshot":
      return getMarketSnapshot();
    case "get_model_details":
      return getModelDetails(args.provider as string, args.model as string);
    case "get_recent_changes":
      return getRecentChanges(args.limit as number);
    case "run_radar":
      return runRadarTool(args.mode as string);
    case "get_candidates":
      return getCandidates();
    case "compare_models":
      return compareModels(args.models as string[]);
    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
}

async function getMarketSnapshot(): Promise<ToolResult> {
  const state = await materializeState(DB_PATH);
  const lines: string[] = ["# LiveLLM Market Snapshot\n"];

  for (const model of state.models) {
    const price = model.pricing.input_per_1m
      ? `$${model.pricing.input_per_1m}/1M input`
      : model.pricing.monthly
      ? `$${model.pricing.monthly}/mo`
      : "unknown";
    const output = model.pricing.output_per_1m ? `$${model.pricing.output_per_1m}/1M output` : "";
    const free = model.free_tier ? `Free: ${model.free_tier.quota} ${model.free_tier.period ?? ""}` : "";

    lines.push(`## ${model.provider} / ${model.name}`);
    lines.push(`- Price: ${price} ${output}`);
    if (free) lines.push(`- ${free}`);
    if (model.limits?.requests_per_day) lines.push(`- Limit: ${model.limits.requests_per_day}/day`);
    if (model.evidence) lines.push(`- Source: "${model.evidence.slice(0, 100)}..."`);
    lines.push("");
  }

  lines.push(`\n_Generated: ${state.generated_at} | ${state.stats.total_entities} models | ${state.stats.total_facts} facts_`);

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

async function getModelDetails(provider: string, model?: string): Promise<ToolResult> {
  const factRepo = new FactRepo();
  const entities = await factRepo.getEntities();
  const filtered = entities.filter((e) => {
    const [p, m] = e.split(":");
    if (p.toLowerCase() !== provider.toLowerCase()) return false;
    if (model && !m.toLowerCase().includes(model.toLowerCase())) return false;
    return true;
  });

  if (filtered.length === 0) {
    return { content: [{ type: "text", text: `No facts found for ${provider}${model ? `/${model}` : ""}` }] };
  }

  const lines: string[] = [`# ${provider}${model ? ` / ${model}` : ""}\n`];

  for (const entity of filtered) {
    const facts = await factRepo.getEntityFacts(entity);
    lines.push(`## ${entity}`);
    for (const f of facts) {
      lines.push(`- ${f.field}: **${JSON.stringify(f.value)}** ${f.unit ?? ""}`);
    }
    lines.push("");
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

async function getRecentChanges(limit = 20): Promise<ToolResult> {
  const factRepo = new FactRepo();
  const changes = await factRepo.getRecentChanges(limit);

  if (changes.length === 0) {
    return { content: [{ type: "text", text: "No recent changes detected." }] };
  }

  const lines = ["# Recent Changes\n"];
  for (const c of changes) {
    lines.push(`- **${c.entity_id}** ${c.field}: ${c.before_json} → ${c.after_json} _(${c.detected_at})_`);
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

async function runRadarTool(mode = "live"): Promise<ToolResult> {
  const results = await runRadar({
    mode,
    fixtureDir: resolve(process.cwd(), "fixtures", "serpapi"),
    dbPath: DB_PATH,
  });

  const totalHits = results.reduce((s, r) => s + r.rawHits, 0);
  const totalCandidates = results.reduce((s, r) => s + r.candidates, 0);

  return {
    content: [
      {
        type: "text",
        text: `Radar complete: ${results.length} queries, ${totalHits} hits, ${totalCandidates} candidates discovered.`,
      },
    ],
  };
}

async function getCandidates(): Promise<ToolResult> {
  const repo = new CandidateRepo();
  const candidates = await repo.getUnverified();

  if (candidates.length === 0) {
    return { content: [{ type: "text", text: "No unverified candidates." }] };
  }

  const lines = ["# Unverified Candidates\n"];
  for (const c of candidates) {
    lines.push(
      `- **${c.provider_hint ?? "?"}:${c.product_hint ?? "?"}** (${c.change_type ?? "?"}) priority=${c.priority}`
    );
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

async function compareModels(models: string[]): Promise<ToolResult> {
  const factRepo = new FactRepo();
  const lines = ["# Model Comparison\n", "| Model | Input/1M | Output/1M | Monthly | Free Tier |", "|-------|----------|-----------|---------|-----------|"];

  for (const entity of models) {
    const facts = await factRepo.getEntityFacts(entity);
    const input = facts.find((f: any) => f.field === "input_price_usd_per_million");
    const output = facts.find((f: any) => f.field === "output_price_usd_per_million");
    const monthly = facts.find((f: any) => f.field === "monthly_price_usd");
    const free = facts.find((f: any) => f.field === "free_tier_quota");

    lines.push(
      `| ${entity} | ${input ? "$" + input.value : "—"} | ${output ? "$" + output.value : "—"} | ${monthly ? "$" + monthly.value : "—"} | ${free ? free.value : "—"} |`
    );
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}
