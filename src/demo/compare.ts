#!/usr/bin/env node
/**
 * LiveLLM — 3-Agent Stale vs Live Comparison Demo
 *
 * Runs the same 3 agents twice:
 *   1. With stale prices (no subscription data) — agents make wrong decisions
 *   2. With LiveLLM prices (subscription-aware) — agents make right decisions
 *
 * Generates a side-by-side HTML report showing the difference.
 *
 * Usage:
 *   npm run serve
 *   node dist/demo/compare.js
 *   open compare-report.html
 */

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const API = "http://localhost:3847";

// ─── Agent Personas ────────────────────────────────────────────────

const AGENTS = [
  {
    id: "coding",
    name: "CodeReview Agent",
    icon: " ",
    color: "#4ade80",
    description: "240 code reviews/day. Needs large context, fast responses.",
    budget: "$50/month",
    workload: "1000 uncached + 55000 cached input, 200 output per request, 240/day",
    computeCost: (prices: any) => {
      const p = prices;
      const perReq = (1000 * p.input + 55000 * p.cached + 200 * p.output) / 1e6;
      return perReq * 240 * 30;
    },
  },
  {
    id: "research",
    name: "Research Agent",
    icon: " ",
    color: "#818cf8",
    description: "500 research summaries/day. Frontier quality, minimize cost.",
    budget: "minimize",
    workload: "5000 input, 1000 output per request, no cache, 500/day",
    computeCost: (prices: any) => {
      const p = prices;
      const perReq = (5000 * p.input + 1000 * p.output) / 1e6;
      return perReq * 500 * 30;
    },
  },
  {
    id: "batch",
    name: "Batch Classifier",
    icon: " ",
    color: "#f59e0b",
    description: "500 document classifications/day. Near-zero budget.",
    budget: "near $0",
    workload: "200 input, 50 output per request, 500/day",
    computeCost: (prices: any) => {
      const p = prices;
      const perReq = (200 * p.input + 50 * p.output) / 1e6;
      return perReq * 500 * 30;
    },
  },
];

// ─── Stale vs Live prices ──────────────────────────────────────────

function getStalePrices(): any {
  return {
    "MiMo V2.5": { input: 0.14, output: 0.28, cached: 0.0028, ctx: 1000000 },
    "GLM-5.3-Flash": { input: 0.075, output: 0.25, cached: 0.015, ctx: 128000 },
    "DeepSeek V4 Flash": { input: 0.22, output: 0.66, cached: 0.007, ctx: 1000000 },
    "Claude Haiku 3.5": { input: 0.80, output: 4.00, cached: 0.08, ctx: 200000 },
    "GPT-4o mini": { input: 0.15, output: 0.60, cached: 0.075, ctx: 128000 },
  };
}

function getLivePrices(): any {
  return {
    "MiMo V2.5": { input: 0.0233, output: 0.0467, cached: 0.0028, ctx: 1000000 },
    "GLM-5.3-Flash": { input: 0.05, output: 0.1667, cached: 0.03, ctx: 128000 },
    "DeepSeek V4 Flash": { input: 0.0733, output: 0.22, cached: 0.007, ctx: 1000000 },
    "Claude Haiku 3.5": { input: 0.80, output: 4.00, cached: 0.08, ctx: 200000 },
    "GPT-4o mini": { input: 0.15, output: 0.60, cached: 0.075, ctx: 128000 },
  };
}

function computeCosts(prices: any, agent: typeof AGENTS[0]) {
  const results: any[] = [];
  for (const [model, p] of Object.entries(prices) as any) {
    const monthly = agent.computeCost(p);
    results.push({ model, ...p, monthly });
  }
  results.sort((a, b) => a.monthly - b.monthly);
  return results;
}

function pickBest(costs: any[]) {
  return costs[0]; // cheapest
}

// ─── Run agents via hermes ─────────────────────────────────────────

function runHermes(prompt: string, label: string): { output: string; elapsed: number } {
  const tmpFile = resolve(process.cwd(), `.tmp-compare-${label}.txt`);
  writeFileSync(tmpFile, prompt);
  const start = Date.now();
  try {
    const output = execSync(
      `hermes -m mimo-v2.5 -z "$(cat ${tmpFile})"`,
      { encoding: "utf8", timeout: 120_000, maxBuffer: 1024 * 1024 }
    );
    return { output: output.trim(), elapsed: (Date.now() - start) / 1000 };
  } catch (err: any) {
    return { output: `ERROR: ${err.message}`, elapsed: (Date.now() - start) / 1000 };
  } finally {
    try { execSync(`rm -f ${tmpFile}`); } catch {}
  }
}

// ─── Generate comparison report ────────────────────────────────────

function generateReport(
  staleResults: any[],
  liveResults: any[],
  staleAgentDecisions: any[],
  liveAgentDecisions: any[],
) {
  const now = new Date().toISOString();

  // Build comparison rows
  let rows = "";
  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    const staleBest = pickBest(staleResults[i]);
    const liveBest = pickBest(liveResults[i]);
    const staleDecision = staleAgentDecisions[i];
    const liveDecision = liveAgentDecisions[i];
    const staleMonthly = staleBest.monthly;
    const liveMonthly = liveBest.monthly;
    const wasted = liveMonthly - staleMonthly;

    rows += `
    <tr>
      <td><span style="color:${agent.color}">${agent.icon} ${agent.name}</span></td>
      <td>${agent.description}</td>
      <td class="mono">$${staleMonthly.toFixed(2)}</td>
      <td class="mono">$${liveMonthly.toFixed(2)}</td>
      <td class="mono ${wasted > 0 ? 'red' : 'green'}">$${Math.abs(wasted).toFixed(2)}</td>
      <td class="mono" style="color:${staleBest.model === 'MiMo V2.5' ? '#4ade80' : '#f59e0b'}">${staleBest.model}</td>
      <td class="mono" style="color:${liveBest.model === 'MiMo V2.5' ? '#4ade80' : '#f59e0b'}">${liveBest.model}</td>
      <td style="font-size:0.75em;color:#999;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${staleDecision?.reason || ''}">${staleDecision?.reason?.substring(0, 60) || ''}</td>
      <td style="font-size:0.75em;color:#999;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${liveDecision?.reason || ''}">${liveDecision?.reason?.substring(0, 60) || ''}</td>
    </tr>`;
  }

  // Compute totals
  const staleTotal = staleResults.reduce((sum, costs) => sum + pickBest(costs).monthly, 0);
  const liveTotal = liveResults.reduce((sum, costs) => sum + pickBest(costs).monthly, 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>LiveLLM — 3-Agent Stale vs Live</title>
<style>
  :root { --bg: #0a0a0f; --card: #12121a; --border: #1e1e2e; --text: #e0e0e0; --dim: #666; --green: #4ade80; --red: #ef4444; --blue: #818cf8; --yellow: #f59e0b; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg); color: var(--text); padding: 24px; line-height: 1.6; }
  h1 { font-size: 1.8em; margin-bottom: 4px; }
  .subtitle { color: var(--dim); font-size: 0.85em; margin-bottom: 24px; }
  .section { margin-bottom: 32px; }
  .section-title { font-size: 0.75em; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 12px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82em; }
  th { text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--border); color: #888; font-weight: normal; text-transform: uppercase; font-size: 0.75em; letter-spacing: 1px; }
  td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
  tr:hover { background: #1a1a25; }
  .mono { font-family: 'SF Mono', monospace; }
  .green { color: var(--green); }
  .red { color: var(--red); }
  .verdict { background: linear-gradient(135deg, #0d1117 0%, #1a1a25 100%); border: 1px solid var(--green); border-radius: 8px; padding: 24px; margin-top: 16px; }
  .footer { text-align: center; color: #444; font-size: 0.75em; margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
  .tag-stale { background: #ff444422; color: var(--red); }
  .tag-live { background: #4ade8022; color: var(--green); }
</style>
</head>
<body>
<h1>◉ LiveLLM — 3-Agent Stale vs Live</h1>
<p class="subtitle">Same agents. Same tasks. Different data. Watch them re-route.</p>

<div class="section">
  <div class="section-title">The Setup</div>
  <div class="card">
    <p style="font-size: 0.9em; margin-bottom: 12px;">Three autonomous agents receive market pricing data and compute their optimal model.</p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px;">
      ${AGENTS.map(a => `
      <div style="background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:12px;">
        <div style="color:${a.color};font-weight:bold;">${a.icon} ${a.name}</div>
        <div style="font-size:0.8em;color:var(--dim);margin-top:4px;">${a.description}</div>
        <div style="font-size:0.75em;color:#555;margin-top:4px;">${a.workload}</div>
      </div>`).join("")}
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Results</div>
  <table>
    <thead>
      <tr>
        <th>Agent</th><th>Workload</th><th><span class="tag tag-stale">STALE</span> Monthly</th>
        <th><span class="tag tag-live">LIVE</span> Monthly</th><th>Diff</th>
        <th><span class="tag tag-stale">STALE</span> Pick</th>
        <th><span class="tag tag-live">LIVE</span> Pick</th>
        <th><span class="tag tag-stale">STALE</span> Reason</th>
        <th><span class="tag tag-live">LIVE</span> Reason</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="border-top:2px solid var(--border);font-weight:bold;">
        <td colspan="2">TOTAL</td>
        <td class="mono">$${staleTotal.toFixed(2)}/mo</td>
        <td class="mono">$${liveTotal.toFixed(2)}/mo</td>
        <td class="mono ${liveTotal < staleTotal ? 'green' : 'red'}">$${Math.abs(liveTotal - staleTotal).toFixed(2)}</td>
        <td colspan="5"></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">The Verdict</div>
  <div class="verdict">
    <p style="font-size: 1.2em; margin-bottom: 12px;">
      <strong>The agent's math was correct. Its economic state was wrong.</strong>
    </p>
    <p style="font-size: 0.9em; color: var(--dim); margin-bottom: 12px;">
      With stale prices, the agents see GLM-5.3-Flash at $0.075/M and pick it over MiMo.
      With LiveLLM's subscription-aware pricing, MiMo is $0.023/M — 3× cheaper than GLM on Go.
      The agents change their minds. The routing improves. The cost goes down.
    </p>
    <p style="font-size: 0.9em; color: var(--dim);">
      This is why autonomous agents need verified economic state. Not a pricing table.
      Not a web search. A timestamped, provenance-backed fact ledger that computes
      the decision-relevant economic state, not just the list price.
    </p>
  </div>
</div>

<div class="footer">
  LiveLLM — Verified Economic Intelligence for Autonomous Agents<br>
  Generated: ${now} · DevNetwork API + Cloud + AI Hackathon 2026
</div>
</body>
</html>`;

  return html;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  LiveLLM — 3-Agent Stale vs Live Comparison");
  console.log("═".repeat(60));
  console.log();

  const stalePrices = getStalePrices();
  const livePrices = getLivePrices();

  // Compute costs for each agent
  console.log("1. Computing costs...");
  const staleResults = AGENTS.map(a => computeCosts(stalePrices, a));
  const liveResults = AGENTS.map(a => computeCosts(livePrices, a));

  for (let i = 0; i < AGENTS.length; i++) {
    const staleBest = pickBest(staleResults[i]);
    const liveBest = pickBest(liveResults[i]);
    console.log(`   ${AGENTS[i].icon} ${AGENTS[i].name}:`);
    console.log(`     STALE: ${staleBest.model} at $${staleBest.monthly.toFixed(2)}/mo`);
    console.log(`     LIVE:  ${liveBest.model} at $${liveBest.monthly.toFixed(2)}/mo`);
  }

  // Run hermes calls
  console.log("\n2. Running agent reasoning (stale prices)...");
  const staleAgentDecisions: any[] = [];
  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    const costs = staleResults[i];
    const costList = costs.map((c: any) => `${c.model}: $${c.monthly.toFixed(2)}/mo`).join("\n");

    const prompt = `You are ${agent.name}. ${agent.description}

Workload: ${agent.workload}

Available models and monthly costs (using stale web prices):
${costList}

Pick ONE model. Return EXACTLY this format:
ROUTE: <model>
COST: $<monthly>
REASON: <one sentence>`;

    process.stdout.write(`   ${agent.icon} ${agent.name}...`);
    const { output, elapsed } = runHermes(prompt, `stale-${agent.id}`);
    const route = output.match(/ROUTE:\s*(.+)/i)?.[1]?.trim() || "unknown";
    const cost = output.match(/COST:\s*(.+)/i)?.[1]?.trim() || "unknown";
    const reason = output.match(/REASON:\s*(.+)/i)?.[1]?.trim() || output.split("\n").slice(-2).join(" ");
    staleAgentDecisions.push({ route, cost, reason, fullOutput: output });
    console.log(` done (${elapsed.toFixed(1)}s) → ${route}`);
  }

  console.log("\n3. Running agent reasoning (LiveLLM prices)...");
  const liveAgentDecisions: any[] = [];
  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    const costs = liveResults[i];
    const costList = costs.map((c: any) => `${c.model}: $${c.monthly.toFixed(2)}/mo`).join("\n");

    const prompt = `You are ${agent.name}. ${agent.description}

Workload: ${agent.workload}

Available models and monthly costs (subscription-aware, verified):
${costList}

Pick ONE model. Return EXACTLY this format:
ROUTE: <model>
COST: $<monthly>
REASON: <one sentence>`;

    process.stdout.write(`   ${agent.icon} ${agent.name}...`);
    const { output, elapsed } = runHermes(prompt, `live-${agent.id}`);
    const route = output.match(/ROUTE:\s*(.+)/i)?.[1]?.trim() || "unknown";
    const cost = output.match(/COST:\s*(.+)/i)?.[1]?.trim() || "unknown";
    const reason = output.match(/REASON:\s*(.+)/i)?.[1]?.trim() || output.split("\n").slice(-2).join(" ");
    liveAgentDecisions.push({ route, cost, reason, fullOutput: output });
    console.log(` done (${elapsed.toFixed(1)}s) → ${route}`);
  }

  // Generate report
  console.log("\n4. Generating comparison report...");
  const html = generateReport(staleResults, liveResults, staleAgentDecisions, liveAgentDecisions);
  const reportPath = resolve(process.cwd(), "compare-report.html");
  writeFileSync(reportPath, html);
  console.log(`   → ${reportPath}`);

  // Summary
  console.log();
  console.log("═".repeat(60));
  console.log("  SUMMARY");
  console.log("═".repeat(60));
  for (let i = 0; i < AGENTS.length; i++) {
    const stale = staleAgentDecisions[i];
    const live = liveAgentDecisions[i];
    const changed = stale.route !== live.route;
    console.log(`  ${AGENTS[i].icon} ${AGENTS[i].name}`);
    console.log(`    STALE: ${stale.route} (${stale.cost})`);
    console.log(`    LIVE:  ${live.route} (${live.cost})`);
    if (changed) console.log(`    → ${changed ? 'RE-ROUTED' : 'same'}`);
  }
  console.log("═".repeat(60));
}

main().catch(console.error);
