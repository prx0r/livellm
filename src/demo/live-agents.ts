#!/usr/bin/env node
/**
 * LiveLLM 3-Agent Demo
 *
 * Three autonomous agents receive the same canonical market payload
 * from LiveLLM. Each reasons about the data based on its own needs
 * and makes a routing decision.
 *
 * Usage:
 *   npm run serve
 *   node dist/demo/live-agents.js
 *   open demo-report.html
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API = "http://localhost:3847";

// ─── Agent Personas ────────────────────────────────────────────────

const AGENTS = [
  {
    id: "coding",
    name: "CodeReview Agent",
    icon: " ",
    color: "#4ade80",
    description: "240 large code reviews/day. Needs large context, fast responses, good code understanding.",
    budget: "$50/month",
    persona: `You are a coding agent that reviews pull requests. You process 240 code reviews per day. Each review involves reading large diffs (1000 uncached input tokens, 55000 cached tokens from repeated file patterns, 200 output tokens for the review).

Your requirements:
- LARGE context window (must fit full file + PR diff)
- Fast response time (reviews block CI)
- Good code understanding quality
- Budget: $50/month

Use the market data to compute cost_per_request for each route:
PAYG: (input_per_1m * uncached_tokens + cached_input_per_1m * cached_tokens + output_per_1m * output_tokens) / 1,000,000
Then multiply by 240 requests/day * 30 days.

Pick ONE route. Return EXACTLY this format:
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
- FRONTIER quality (best reasoning)
- Minimize cost
- Can tolerate slower responses

Use the market data to compute cost_per_request for each route:
PAYG: (input_per_1m * 5000 + output_per_1m * 1000) / 1,000,000
Then multiply by 500 requests/day * 30 days.

Pick ONE route. Return EXACTLY this format:
ROUTE: <provider>:<model>
COST: $<estimated monthly>
REASON: <one sentence>`,
  },
  {
    id: "batch",
    name: "Batch Classifier",
    icon: " ",
    color: "#f59e0b",
    description: "500 document classifications/day. Near-zero budget. Short inputs.",
    budget: "near $0",
    persona: `You are a high-volume batch classification agent. You classify 500 documents per day into categories. Each request is tiny: 200 input tokens, 50 output tokens.

Your requirements:
- LOWEST possible cost (ideally free)
- Can tolerate slow responses
- Short context is fine (200 tokens)

Use the market data. Check free_tier first — if a model's free quota covers 500/day, it's $0. Otherwise compute:
(input_per_1m * 200 + output_per_1m * 50) / 1,000,000 * 500 * 30

Pick ONE route. Return EXACTLY this format:
ROUTE: <provider>:<model>
COST: $<estimated monthly>
REASON: <one sentence>`,
  },
];

// ─── Run one agent via hermes ──────────────────────────────────────

function runAgent(agent: typeof AGENTS[0], marketJson: string) {
  const prompt = `${agent.persona}

MARKET DATA (from LiveLLM API — compute costs yourself):
${marketJson}`;

  const tmpFile = resolve(process.cwd(), `.tmp-agent-${agent.id}.txt`);
  writeFileSync(tmpFile, prompt);

  try {
    const output = execSync(
      `hermes -m mimo-v2.5 -z "$(cat ${tmpFile})"`,
      { encoding: "utf8", timeout: 120_000, maxBuffer: 1024 * 1024 }
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
  radarOutput: string,
  investigateOutput: string,
) {
  const now = new Date().toISOString();

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
            <td>${r.max_output_tokens ? r.max_output_tokens.toLocaleString() : "—"}</td>
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
  .subtitle { color: var(--dim); font-size: 0.85em; margin-bottom: 24px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 0.75em; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82em; }
  th { text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--border); color: #888; font-weight: normal; text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; }
  td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
  tr:hover { background: #1a1a25; }
  .promo { color: #4ade80; }
  .agents { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .agent-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; position: relative; overflow: hidden; }
  .agent-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .agent-card.coding::before { background: #4ade80; }
  .agent-card.frontier::before { background: #818cf8; }
  .agent-card.batch::before { background: #f59e0b; }
  .agent-name { font-size: 1.1em; font-weight: bold; margin-bottom: 4px; }
  .agent-desc { font-size: 0.8em; color: var(--dim); margin-bottom: 12px; }
  .agent-budget { font-size: 0.75em; color: #888; margin-bottom: 16px; padding: 4px 8px; background: #1a1a25; border-radius: 4px; display: inline-block; }
  .decision { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 14px; margin-top: 12px; }
  .decision-label { font-size: 0.7em; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 6px; }
  .decision-route { font-size: 1.3em; font-weight: bold; margin-bottom: 4px; }
  .decision-cost { color: #4ade80; font-size: 1.1em; margin-bottom: 6px; }
  .decision-reason { font-size: 0.85em; color: #aaa; font-style: italic; }
  .full-output { background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 14px; margin-top: 12px; font-size: 0.78em; color: #999; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }
  .footer { text-align: center; color: #444; font-size: 0.75em; margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); }
  @media (max-width: 900px) { .agents { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<h1>LiveLLM — 3-Agent Live Demo</h1>
<p class="subtitle">SerpApi discovers. LiveLLM verifies. Agents decide.</p>

<div class="section">
  <div class="section-title">Step 1: SerpApi Discovery → Fact Ledger</div>
  <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:20px; margin-bottom:16px;">
    <p style="font-size:0.85em; color:#aaa; margin-bottom:12px;">
      SerpApi searches detect market changes. LiveLLM verifies them against official sources,
      extracts structured facts with AI, and stores them in a provenance-backed fact ledger.
      Every fact traces back to a specific SerpApi search ID and official source URL.
    </p>
    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-top:16px;">
      <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:12px; text-align:center;">
        <div style="color:#4ade80; font-size:1.5em; font-weight:bold;">SerpApi</div>
        <div style="font-size:0.75em; color:#666; margin-top:4px;">Google News Light<br>Search Index Deep</div>
      </div>
      <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:12px; text-align:center;">
        <div style="color:#818cf8; font-size:1.5em; font-weight:bold;">Verify</div>
        <div style="font-size:0.75em; color:#666; margin-top:4px;">Official Sources<br>AI Extraction</div>
      </div>
      <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:12px; text-align:center;">
        <div style="color:#f59e0b; font-size:1.5em; font-weight:bold;">Validate</div>
        <div style="font-size:0.75em; color:#666; margin-top:4px;">Evidence Check<br>Range + Unit</div>
      </div>
      <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:12px; text-align:center;">
        <div style="color:#ef4444; font-size:1.5em; font-weight:bold;">Ledger</div>
        <div style="font-size:0.75em; color:#666; margin-top:4px;">Temporal Facts<br>Provenance Chain</div>
      </div>
    </div>
  </div>

  <details>
    <summary style="font-size:0.8em; color:#888; cursor:pointer; margin-bottom:8px;">Show radar pipeline output (from replay fixtures)</summary>
    <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:14px; font-size:0.75em; color:#999; white-space:pre-wrap; max-height:200px; overflow-y:auto;">${escapeHtml(radarOutput)}</div>
  </details>

  <details>
    <summary style="font-size:0.8em; color:#888; cursor:pointer; margin-top:8px;">Show investigation pipeline output</summary>
    <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:14px; font-size:0.75em; color:#999; white-space:pre-wrap; max-height:200px; overflow-y:auto;">${escapeHtml(investigateOutput)}</div>
  </details>
</div>

<div class="section">
  <div class="section-title">Step 2: Canonical Market Payload</div>
  <table>
    <thead>
      <tr>
        <th>Model</th><th>Provider</th><th>Input/1M</th><th>Output/1M</th><th>Cached/1M</th>
        <th>Monthly</th><th>Context</th><th>Max Out</th><th>Free Tier</th><th>Promo</th>
      </tr>
    </thead>
    <tbody>${modelRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Step 3: Agent Decisions</div>
  <div class="agents">
    ${decisions.map((d) => `
    <div class="agent-card ${d.id}">
      <div class="agent-name">${d.icon} ${d.name}</div>
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
    </div>`).join("")}
  </div>
</div>

<div class="section">
  <div class="section-title">The Point</div>
  <div style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:24px; max-width:700px;">
    <p style="font-size:0.95em; margin-bottom:12px;">
      <strong>LiveLLM amortizes SerpApi discovery into reusable economic intelligence.</strong>
    </p>
    <p style="font-size:0.85em; color:#aaa; margin-bottom:12px;">
      A SerpApi search isn't thrown away. Its results and discovered sources feed a provenance
      ledger. Once verified, that intelligence answers thousands of cheap agent queries until
      freshness policy says it needs reacquisition.
    </p>
    <p style="font-size:0.85em; color:#aaa;">
      The same market payload served three agents with completely different needs.
      Each agent computed its own costs and made its own decision.
      LiveLLM is infrastructure, not an opinion.
    </p>
  </div>
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

function runRadar(): string {
  try {
    return execSync(`node dist/cli.js radar --mode replay --fixture-dir ./fixtures/serpapi 2>&1`, {
      encoding: "utf8",
      timeout: 30_000,
    });
  } catch (err: any) {
    return err.stdout ?? err.message;
  }
}

function runInvestigate(): string {
  try {
    return execSync(`node dist/cli.js investigate 2>&1`, {
      encoding: "utf8",
      timeout: 30_000,
    });
  } catch (err: any) {
    return err.stdout ?? err.message;
  }
}

async function main() {
  console.log("═".repeat(60));
  console.log("  LiveLLM — 3-Agent Live Demo");
  console.log("═".repeat(60));
  console.log();

  // 0. Run SerpApi radar pipeline (replay mode — real responses, zero credits)
  console.log("0. Running SerpApi radar pipeline (replay mode)...");
  console.log("   Processing real SerpApi search responses through the full pipeline...");
  console.log();

  const radarOutput = runRadar();
  console.log("   Radar output:");
  for (const line of radarOutput.split("\n").filter(Boolean).slice(0, 15)) {
    console.log(`   ${line}`);
  }
  console.log();

  console.log("   Running investigation pipeline...");
  const investigateOutput = runInvestigate();
  console.log("   Investigation output:");
  for (const line of investigateOutput.split("\n").filter(Boolean).slice(0, 10)) {
    console.log(`   ${line}`);
  }
  console.log();

  // 1. Fetch market data
  console.log("1. Fetching canonical market payload from API...");
  const raw = execSync(`curl -s ${API}/v1/market`, { encoding: "utf8" });
  const market = JSON.parse(raw);
  console.log(`   → ${market.models.length} models, ${market.stats.total_facts} facts`);

  const marketJson = JSON.stringify(market, null, 2);

  // 2. Run agents
  console.log("2. Running 3 agents (mimo-v2.5)...");
  console.log("   (this takes ~60-90s for all three)");

  const results: Array<{ agent: typeof AGENTS[0]; output: string }> = [];

  for (const agent of AGENTS) {
    process.stdout.write(`   ${agent.icon} ${agent.name}...`);
    const start = Date.now();
    const output = runAgent(agent, marketJson);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(` done (${elapsed}s)`);
    results.push({ agent, output });
  }

  // 3. Generate report
  console.log("3. Generating visual report...");
  const html = generateReport(results, market, radarOutput, investigateOutput);
  const reportPath = resolve(process.cwd(), "demo-report.html");
  writeFileSync(reportPath, html);
  console.log(`   → ${reportPath}`);

  // 4. Summary
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
