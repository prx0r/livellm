#!/usr/bin/env node
/**
 * LiveLLM 3-Agent Demo
 *
 * One command runs three autonomous agents with different needs against
 * the same LiveLLM market payload. Each agent calls the API, reasons about
 * the data, and makes a routing decision. Results are compiled into a
 * self-contained HTML report judges can open in a browser.
 *
 * Usage:
 *   node dist/demo/live-agents.js
 *   open demo-report.html
 */

import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const API = "http://localhost:3847";

// ─── Agent Personas ────────────────────────────────────────────────

const AGENTS = [
  {
    id: "coding",
    name: "CodeReview Agent",
    icon: " ",
    color: "#4ade80",
    description: "240 large code reviews/day. Needs 1M context, fast responses, good code understanding.",
    budget: "$50/month",
    persona: `You are a coding agent that reviews pull requests. You need to process 240 code reviews per day. Each review involves reading large diffs (1000 uncached input tokens, 55000 cached tokens from repeated file patterns, 200 output tokens for the review).

Your requirements:
- LARGE context window (must fit full file + PR diff)
- Fast response time (reviews block CI)
- Good code understanding quality
- Budget: $50/month

Pick ONE route from the market data. Return EXACTLY this format:
ROUTE: <provider>:<model>
COST: $<estimated monthly>
REASON: <one sentence>`,
  },
  {
    id: "frontier",
    name: "Research Agent",
    icon: " ",
    color: "#818cf8",
    description: "500 research summaries/day. Frontier quality, minimize cost. No caching.",
    budget: "minimize",
    persona: `You are a research summarization agent. You process 500 requests per day, each with 5000 input tokens and 1000 output tokens. No caching (each request is unique content).

Your requirements:
- FRONTIER quality (best reasoning, not "fast" tier)
- Minimize cost (no budget ceiling, just be cheap)
- Can tolerate slightly slower responses
- No caching benefit

Pick ONE route from the market data. Return EXACTLY this format:
ROUTE: <provider>:<model>
COST: $<estimated monthly>
REASON: <one sentence>`,
  },
  {
    id: "batch",
    name: "Batch Classifier",
    icon: " ",
    color: "#f59e0b",
    description: "10,000 document classifications/day. Near-zero budget. Short inputs.",
    budget: "near $0",
    persona: `You are a high-volume batch classification agent. You classify 10,000 documents per day into categories. Each request is tiny: 200 input tokens, 50 output tokens.

Your requirements:
- LOWEST possible cost (ideally free)
- Can tolerate slow responses (batch processing)
- Short context is fine (200 tokens)
- Budget: as close to $0 as possible

If a free tier exists that covers your volume, use it. Otherwise pick the cheapest paid option.

Pick ONE route from the market data. Return EXACTLY this format:
ROUTE: <provider>:<model>
COST: $<estimated monthly>
REASON: <one sentence>`,
  },
];

// ─── Fetch live data ───────────────────────────────────────────────

function fetchMarket() {
  const raw = execSync(`curl -s ${API}/v1/market`, { encoding: "utf8" });
  return JSON.parse(raw);
}

function fetchEconomics(model: string, workload: Record<string, number>) {
  const body = JSON.stringify({ model, workload });
  const raw = execSync(
    `curl -s -X POST ${API}/v1/economics/route -H 'Content-Type: application/json' -d '${body.replace(/'/g, "'\\''")}'`,
    { encoding: "utf8" }
  );
  return JSON.parse(raw);
}

// ─── Run one agent via hermes ──────────────────────────────────────

function runAgent(agent: typeof AGENTS[0], marketJson: string, economicsJson: string) {
  const prompt = `${agent.persona}

MARKET DATA:
${marketJson}

ROUTE EVALUATION:
${economicsJson}`;

  // Write prompt to temp file to avoid shell escaping issues
  const tmpFile = resolve(process.cwd(), `.tmp-agent-${agent.id}.txt`);
  writeFileSync(tmpFile, prompt);

  try {
    const output = execSync(
      `hermes -m mimo-v2.5 -z "$(cat ${tmpFile})"`,
      {
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      }
    );
    return output.trim();
  } catch (err: any) {
    return `ERROR: ${err.message}`;
  } finally {
    try { execSync(`rm -f ${tmpFile}`); } catch {}
  }
}

// ─── Generate HTML report ──────────────────────────────────────────

function generateReport(
  agents: Array<{ agent: typeof AGENTS[0]; output: string }>,
  market: any,
  economics: any
) {
  const now = new Date().toISOString();

  // Parse each agent's decision
  const decisions = agents.map(({ agent, output }) => {
    const routeMatch = output.match(/ROUTE:\s*(.+)/i);
    const costMatch = output.match(/COST:\s*(.+)/i);
    const reasonMatch = output.match(/REASON:\s*(.+)/i);
    return {
      ...agent,
      route: routeMatch?.[1]?.trim() ?? "unknown",
      cost: costMatch?.[1]?.trim() ?? "unknown",
      reason: reasonMatch?.[1]?.trim() ?? output.split("\n").slice(-3).join(" "),
      fullOutput: output,
    };
  });

  // Build market table rows
  const modelRows = market.models
    .map((m: any) => {
      return m.routes
        .map((r: any) => {
          const promo = r.promotion
            ? r.promotion.type === "price_discount"
              ? `${r.promotion.discount_pct}% off`
              : `${r.promotion.multiplier}× usage`
            : "—";
          return `<tr>
            <td><strong>${m.model}</strong></td>
            <td>${r.provider}</td>
            <td>$${r.input ?? "—"}</td>
            <td>$${r.output ?? "—"}</td>
            <td>$${r.cached_input ?? "—"}</td>
            <td>${r.monthly ? "$" + r.monthly + "/mo" : "—"}</td>
            <td>${r.context_tokens ? r.context_tokens.toLocaleString() : "—"}</td>
            <td>${r.quality_tier ?? "—"}</td>
            <td>${r.free_tier ? r.free_tier.quota + "/" + r.free_tier.period : "—"}</td>
            <td class="promo">${promo}</td>
          </tr>`;
        })
        .join("");
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LiveLLM — 3-Agent Live Demo</title>
<style>
  :root { --bg: #0a0a0f; --card: #12121a; --border: #1e1e2e; --text: #e0e0e0; --dim: #666; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg); color: var(--text); padding: 24px; line-height: 1.6; }
  h1 { font-size: 1.8em; margin-bottom: 4px; }
  h2 { font-size: 1.2em; color: #888; margin-bottom: 16px; font-weight: normal; }
  h3 { font-size: 1em; margin-bottom: 8px; }
  .subtitle { color: var(--dim); font-size: 0.85em; margin-bottom: 24px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 0.75em; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 12px; }

  /* Market table */
  table { width: 100%; border-collapse: collapse; font-size: 0.82em; }
  th { text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--border); color: #888; font-weight: normal; text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; }
  td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
  tr:hover { background: #1a1a25; }
  .promo { color: #4ade80; }

  /* Agent cards */
  .agents { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .agent-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; position: relative; overflow: hidden; }
  .agent-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .agent-card.coding::before { background: #4ade80; }
  .agent-card.frontier::before { background: #818cf8; }
  .agent-card.batch::before { background: #f59e0b; }
  .agent-icon { font-size: 2em; margin-bottom: 8px; }
  .agent-name { font-size: 1.1em; font-weight: bold; margin-bottom: 4px; }
  .agent-desc { font-size: 0.8em; color: var(--dim); margin-bottom: 12px; }
  .agent-budget { font-size: 0.75em; color: #888; margin-bottom: 16px; padding: 4px 8px; background: #1a1a25; border-radius: 4px; display: inline-block; }

  .decision { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 14px; margin-top: 12px; }
  .decision-label { font-size: 0.7em; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 6px; }
  .decision-route { font-size: 1.3em; font-weight: bold; margin-bottom: 4px; }
  .decision-cost { color: #4ade80; font-size: 1.1em; margin-bottom: 6px; }
  .decision-reason { font-size: 0.85em; color: #aaa; font-style: italic; }

  .full-output { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 14px; margin-top: 12px; font-size: 0.78em; color: #999; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }

  /* Comparison */
  .comparison { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .compare-col { text-align: center; }
  .compare-model { font-size: 1em; font-weight: bold; margin-bottom: 4px; }
  .compare-cost { font-size: 1.5em; font-weight: bold; margin-bottom: 4px; }
  .compare-why { font-size: 0.8em; color: #888; }

  /* Footer */
  .footer { text-align: center; color: #444; font-size: 0.75em; margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); }

  @media (max-width: 900px) { .agents, .comparison { grid-template-columns: 1fr; } }
</style>
</head>
<body>

<h1>LiveLLM — 3-Agent Live Demo</h1>
<p class="subtitle">One canonical market payload. Three autonomous agents. Three different decisions.</p>

<div class="section">
  <div class="section-title">How it works</div>
  <p style="font-size:0.85em; color:#888; max-width:700px;">
    Each agent calls the same <code>GET /v1/market</code> and <code>POST /v1/economics/route</code> endpoints.
    They receive identical data — pricing, promotions, context windows, quality tiers, rate limits, provenance.
    Each agent independently reasons about the data based on its own needs and makes a routing decision.
    <strong>LiveLLM doesn't decide for them. It gives them the truth.</strong>
  </p>
</div>

<div class="section">
  <div class="section-title">Live Market Data (from LiveLLM API)</div>
  <table>
    <thead>
      <tr>
        <th>Model</th><th>Provider</th><th>Input/1M</th><th>Output/1M</th><th>Cached/1M</th>
        <th>Monthly</th><th>Context</th><th>Tier</th><th>Free Tier</th><th>Promo</th>
      </tr>
    </thead>
    <tbody>${modelRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Agent Decisions (live from mimo-v2.5)</div>
  <div class="agents">
    ${decisions
      .map(
        (d) => `
    <div class="agent-card ${d.id}">
      <div class="agent-icon">${d.icon}</div>
      <div class="agent-name">${d.name}</div>
      <div class="agent-desc">${d.description}</div>
      <div class="agent-budget">Budget: ${d.budget}</div>
      <div class="decision">
        <div class="decision-label">Chose</div>
        <div class="decision-route" style="color:${d.color}">${d.route}</div>
        <div class="decision-cost">${d.cost}</div>
        <div class="decision-reason">${d.reason}</div>
      </div>
      <details>
        <summary style="font-size:0.75em; color:#555; cursor:pointer; margin-top:10px;">Full reasoning</summary>
        <div class="full-output">${escapeHtml(d.fullOutput)}</div>
      </details>
    </div>`
      )
      .join("")}
  </div>
</div>

<div class="section">
  <div class="section-title">The Point</div>
  <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:24px; max-width:700px;">
    <p style="font-size:0.95em; margin-bottom:12px;">
      <strong>LiveLLM is infrastructure, not an opinion.</strong>
    </p>
    <p style="font-size:0.85em; color:#aaa; margin-bottom:12px;">
      The same market payload served three agents with completely different needs.
      Each agent extracted what mattered to it — context window, cost, free tier, quality tier —
      and made its own decision. LiveLLM didn't tell them what to pick.
    </p>
    <p style="font-size:0.85em; color:#aaa; margin-bottom:12px;">
      This is what makes it essential for autonomous agents: <strong>verified, provenance-backed,
      machine-readable economic truth</strong> that agents can consume before deciding where to spend money.
    </p>
    <p style="font-size:0.85em; color:#aaa;">
      The data includes freshness timestamps, confidence scores, evidence IDs, and promotion details —
      so agents know not just <em>what</em> is true, but <em>how</em> true and <em>how recently</em> it was verified.
    </p>
  </div>
</div>

<div class="section">
  <div class="section-title">Infrastructure Chain</div>
  <pre style="font-size:0.8em; color:#666; background:var(--card); padding:16px; border-radius:8px; overflow-x:auto;">
  SerpApi Discovery → Official Source → AI Extraction → Deterministic Validation → Fact Ledger
         ↓                                                                    ↓
    Search IDs                                                          Evidence IDs
    Provenance                                                          Confidence
    Timestamps                                                          Freshness
         ↓                                                                    ↓
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                        LiveLLM API (5 endpoints)                            │
  │  GET /v1/market  ·  GET /v1/models  ·  POST /v1/economics/route            │
  │  GET /v1/changes  ·  GET /v1/evidence/:id                                  │
  └──────────────────────────────────────────────────────────────────────────────┘
         ↓                          ↓                          ↓
    ┌─────────┐              ┌─────────┐              ┌─────────┐
    │ Agent 1  │              │ Agent 2  │              │ Agent 3  │
    │ Coding   │              │ Research │              │ Batch    │
    │ MiMo V2.5│              │ MiMo V2.5│              │ Muse Spark│
    └─────────┘              └─────────┘              └─────────┘
  </pre>
</div>

<div class="footer">
  LiveLLM — The live truth layer for AI agents · Built for DevNetwork API + Cloud + AI Hackathon 2026
  <br>Generated: ${now} · Data as of: ${market.as_of ?? market.generated_at}
</div>

</body>
</html>`;

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  LiveLLM — 3-Agent Live Demo");
  console.log("═".repeat(60));
  console.log();

  // 1. Fetch market data
  console.log("1. Fetching market data from API...");
  const market = fetchMarket();
  console.log(`   → ${market.models.length} models, ${market.stats.total_facts} facts`);

  // 2. Fetch economics for coding workload
  console.log("2. Fetching route evaluation...");
  const economics = fetchEconomics("GLM-5.3-Flash", {
    uncached_input_tokens_per_request: 1000,
    cached_input_tokens_per_request: 55000,
    output_tokens_per_request: 200,
    requests: 240,
  });
  console.log(`   → recommendation: ${economics.recommendation?.route ?? "none"}`);

  const marketJson = JSON.stringify(market, null, 2);
  const economicsJson = JSON.stringify(economics, null, 2);

  // 3. Run agents in parallel
  console.log("3. Running 3 agents (mimo-v2.5)...");
  console.log("   (this takes ~60-90s for all three)");

  const results: Array<{ agent: typeof AGENTS[0]; output: string }> = [];

  // Run sequentially to avoid overwhelming hermes
  for (const agent of AGENTS) {
    process.stdout.write(`   ${agent.icon} ${agent.name}...`);
    const start = Date.now();
    const output = runAgent(agent, marketJson, economicsJson);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(` done (${elapsed}s)`);
    results.push({ agent, output });
  }

  // 4. Generate report
  console.log("4. Generating visual report...");
  const html = generateReport(results, market, economics);
  const reportPath = resolve(process.cwd(), "demo-report.html");
  writeFileSync(reportPath, html);
  console.log(`   → ${reportPath}`);

  // 5. Summary
  console.log();
  console.log("═".repeat(60));
  console.log("  RESULTS");
  console.log("═".repeat(60));
  for (const { agent, output } of results) {
    const route = output.match(/ROUTE:\s*(.+)/i)?.[1]?.trim() ?? "?";
    const cost = output.match(/COST:\s*(.+)/i)?.[1]?.trim() ?? "?";
    console.log(`  ${agent.icon} ${agent.name.padEnd(20)} → ${route} (${cost})`);
  }
  console.log("═".repeat(60));
  console.log();
  console.log("Open demo-report.html in a browser to see the full visual demo.");
}

main().catch(console.error);
