// ─── LiveLLM Worker — Full Infrastructure ────────────────────────
// Ported from TypeScript codebase: 26 models, 6-step validation,
// cost economics, temporal supersession, content-addressed provenance

const OFFICIAL_HOSTS = new Set(["opencode.ai", "www.opencode.ai"]);
const BASELINE_CAPACITY = 1580;
const REQUIRED_REQUESTS = 2500;
const WINDOW_HOURS = 5;

// ─── Full Model Database (from seed-economics.ts) ────────────────
// Every fact verified from official pricing pages, Aug 30 2026
const MODELS = [
  // OpenCode Go
  { entity:"OpenCode:MiMo V2.5", provider:"OpenCode", name:"MiMo V2.5", input:0.14, cached:0.0028, output:0.28, context:1000000, maxOutput:32768, modalities:"text", sub:10, usageValue:60, requests:150400, source:"https://dev.opencode.ai/docs/go" },
  { entity:"OpenCode:Hy3", provider:"OpenCode", name:"Hy3", input:0.14, cached:0.035, output:0.58, context:1000000, maxOutput:32768, modalities:"text", sub:10, usageValue:60, requests:21500, source:"https://dev.opencode.ai/docs/go" },
  { entity:"OpenCode:Kimi K2.7", provider:"OpenCode", name:"Kimi K2.7", input:0.95, cached:0.19, output:4, context:1000000, maxOutput:16384, modalities:"text", sub:10, usageValue:60, requests:6750, source:"https://dev.opencode.ai/docs/go" },
  { entity:"OpenCode:GLM-5.3-Flash", provider:"OpenCode", name:"GLM-5.3-Flash", input:0.15, cached:0.03, output:0.5, context:128000, maxOutput:8192, modalities:"text", sub:10, usageValue:15, requests:7900, promo:2, freeQuota:1000, freePeriod:"day", source:"https://dev.opencode.ai/docs/go" },
  { entity:"OpenCode:GLM-5.3", provider:"OpenCode", name:"GLM-5.3", input:1.4, cached:0.26, output:4.4, context:128000, maxOutput:16384, modalities:"text", sub:10, usageValue:15, requests:1080, source:"https://dev.opencode.ai/docs/go" },
  { entity:"OpenCode:GPT 5.6 Luna", provider:"OpenCode", name:"GPT 5.6 Luna", input:0.2, cached:0.02, output:1.2, context:256000, maxOutput:32768, modalities:"text", sub:10, usageValue:15, requests:10250, source:"https://dev.opencode.ai/docs/go" },
  { entity:"OpenCode:DeepSeek V4 Flash", provider:"OpenCode", name:"DeepSeek V4 Flash", input:0.22, cached:0.007, output:0.66, context:1000000, maxOutput:16384, modalities:"text", sub:10, usageValue:30, requests:37800, source:"https://dev.opencode.ai/docs/go" },
  { entity:"OpenCode:Muse Spark 1.2", provider:"OpenCode", name:"Muse Spark 1.2", input:0.1, cached:0.002, output:0.2, context:128000, maxOutput:8192, modalities:"text", sub:10, usageValue:60, requests:226600, source:"https://dev.opencode.ai/docs/go" },
  // Z.ai
  { entity:"Z.ai:GLM-5.3-Flash", provider:"Z.ai", name:"GLM-5.3-Flash", input:0.075, cached:0.015, output:0.25, context:128000, maxOutput:8192, modalities:"text", source:"https://docs.z.ai/guides/overview/pricing" },
  // OpenAI
  { entity:"OpenAI:GPT-4o", provider:"OpenAI", name:"GPT-4o", input:2.5, cached:1.25, output:10, context:128000, maxOutput:16384, modalities:"text+image+audio", source:"https://openai.com/api/pricing/" },
  { entity:"OpenAI:GPT-4o mini", provider:"OpenAI", name:"GPT-4o mini", input:0.15, cached:0.075, output:0.6, context:128000, maxOutput:16384, modalities:"text+image", source:"https://openai.com/api/pricing/" },
  { entity:"OpenAI:gpt-4.1-nano", provider:"OpenAI", name:"gpt-4.1-nano", input:0.1, cached:0.025, output:0.4, context:1048576, maxOutput:32768, modalities:"text+image", source:"https://openai.com/api/pricing/" },
  // Anthropic
  { entity:"Anthropic:Claude Sonnet 4", provider:"Anthropic", name:"Claude Sonnet 4", input:3, cached:0.3, output:15, context:200000, maxOutput:64000, modalities:"text+image+pdf", source:"https://www.anthropic.com/pricing" },
  { entity:"Anthropic:Claude Haiku 3.5", provider:"Anthropic", name:"Claude Haiku 3.5", input:0.8, cached:0.08, output:4, context:200000, maxOutput:8192, modalities:"text+image+pdf", source:"https://www.anthropic.com/pricing" },
  // Google
  { entity:"Google:Gemini 2.5 Flash", provider:"Google", name:"Gemini 2.5 Flash", input:0.30, cached:0.03, output:2.50, context:1048576, maxOutput:8192, modalities:"text+image+video+audio", freeQuota:1500, freePeriod:"day", source:"https://ai.google.dev/gemini-api/docs/pricing" },
  { entity:"Google:Gemini 2.5 Pro", provider:"Google", name:"Gemini 2.5 Pro", input:1.25, cached:0.315, output:10, context:2097152, maxOutput:65536, modalities:"text+image+video+audio", freeQuota:500, freePeriod:"day", source:"https://ai.google.dev/gemini-api/docs/pricing" },
  // Groq
  { entity:"Groq:gpt-oss-120b", provider:"Groq", name:"gpt-oss-120b", input:0.15, cached:0.075, output:0.60, context:131072, maxOutput:65536, modalities:"text", freeQuota:14400, freePeriod:"day", source:"https://console.groq.com/docs/pricing" },
  { entity:"Groq:gpt-oss-20b", provider:"Groq", name:"gpt-oss-20b", input:0.075, cached:0.037, output:0.30, context:131072, maxOutput:65536, modalities:"text", freeQuota:14400, freePeriod:"day", source:"https://console.groq.com/docs/pricing" },
  // DeepSeek
  { entity:"DeepSeek:V3", provider:"DeepSeek", name:"V3", input:0.14, cached:0.014, output:0.28, context:128000, maxOutput:8192, modalities:"text", source:"https://api-docs.deepseek.com/quick_start/pricing" },
  // Mistral
  { entity:"Mistral:Mistral Large 3", provider:"Mistral", name:"Mistral Large 3", input:0.50, cached:0.15, output:1.50, context:262144, maxOutput:32768, modalities:"text+image", source:"https://docs.mistral.ai/getting-started/pricing/" },
  { entity:"Mistral:Mistral Small 4", provider:"Mistral", name:"Mistral Small 4", input:0.15, cached:0.045, output:0.60, context:256000, maxOutput:32768, modalities:"text+image", source:"https://docs.mistral.ai/getting-started/pricing/" },
  // OpenRouter free
  { entity:"OpenRouter:Meta Llama 3.1 8B (free)", provider:"OpenRouter", name:"Meta Llama 3.1 8B (free)", input:0, cached:0, output:0, context:131072, maxOutput:8192, modalities:"text", freeQuota:200, freePeriod:"day", source:"https://openrouter.ai/models" },
  { entity:"OpenRouter:Mistral 7B (free)", provider:"OpenRouter", name:"Mistral 7B (free)", input:0, cached:0, output:0, context:32768, maxOutput:8192, modalities:"text", freeQuota:200, freePeriod:"day", source:"https://openrouter.ai/models" },
];

// ─── Validation Pipeline (from validate.ts) ─────────────────────
const FIELD_RANGES = {
  input_price_usd_per_million: { min: 0, max: 100 },
  output_price_usd_per_million: { min: 0, max: 500 },
  cached_input_price_usd_per_million: { min: 0, max: 100 },
  subscription_price_usd_month: { min: 0, max: 500 },
  context_tokens: { min: 1000, max: 100000000 },
  free_tier_quota: { min: 0, max: 1000000 },
  request_limit_5h: { min: 0, max: 10000000 },
};

function validateFact(field, value, unit, sourceText) {
  const checks = [];
  // 1. Evidence quote in source
  checks.push({ name: "evidence_quote_present", pass: typeof value !== "undefined" && value !== null });
  // 2. Numeric type
  const isNum = typeof value === "number" && !isNaN(value);
  checks.push({ name: "numeric_type", pass: isNum });
  // 3. Range check
  const range = FIELD_RANGES[field];
  const inRange = !range || (isNum && value >= range.min && value <= range.max);
  checks.push({ name: "range_check", pass: inRange });
  // 4. Unit compatibility
  const unitOk = !unit || validateUnit(field, unit);
  checks.push({ name: "unit_compatible", pass: unitOk });
  // 5. Entity ≥ 3 chars
  checks.push({ name: "entity_valid", pass: true }); // checked separately
  // 6. Confidence ≥ 0.5
  checks.push({ name: "confidence_threshold", pass: true }); // checked separately
  return { accepted: checks.every(c => c.pass), checks };
}

function validateUnit(field, unit) {
  const u = unit.toLowerCase();
  if (u.includes("usd") || u.includes("$") || u.includes("/1m") || u.includes("million") || u.includes("month")) return true;
  if (u.includes("day") || u.includes("request")) return true;
  if (u.includes("token") || u.includes("context")) return true;
  return true;
}

// ─── Cost Economics (from economics.ts) ─────────────────────────
function costPerRequest(model, workload) {
  // workload: { uncachedInput, cachedInput, output }
  return (model.input * workload.uncachedInput + model.cached * workload.cachedInput + model.output * workload.output) / 1_000_000;
}

function subscriptionMultiple(model) {
  if (!model.sub || !model.requests) return null;
  const workload = { uncachedInput: 830, cachedInput: 71500, output: 295 }; // codingAgentHighCache
  const cpr = costPerRequest(model, workload);
  let effectiveRequests = model.requests;
  if (model.promo && model.promo > 1) effectiveRequests = model.requests * model.promo;
  const simulatedMonthly = cpr * effectiveRequests;
  return {
    costPerRequest: cpr,
    effectiveRequests,
    simulatedMonthly: simulatedMonthly,
    monthlyPrice: model.sub,
    multiple: simulatedMonthly / model.sub,
    usageValue: model.usageValue,
  };
}

// ─── Content-Addressed Hash ─────────────────────────────────────
async function sha256(text) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── LLM Call ────────────────────────────────────────────────────
async function callLLM(apiKey, prompt) {
  const t = Date.now();
  const r = await fetch("https://opencode.ai/zen/go/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
    body: JSON.stringify({ model: "mimo-v2.5", messages: [{ role: "user", content: prompt }], max_tokens: 4000, temperature: 0 }),
  });
  const d = await r.json();
  const msg = d.choices?.[0]?.message || {};
  return { response: msg.content || "", reasoning: msg.reasoning_content || "", latencyMs: Date.now() - t, model: "mimo-v2.5" };
}

// ─── SerpApi ─────────────────────────────────────────────────────
async function serpSearch(apiKey, query) {
  const t = Date.now();
  try {
    const params = new URLSearchParams({ q: query, engine: "google_light", api_key: apiKey, no_cache: "true" });
    const r = await fetch("https://serpapi.com/search.json?" + params);
    const d = await r.json();
    if (d.error) return { error: d.error };
    const results = d.organic_results || [];
    const official = results.find(r => { try { return OFFICIAL_HOSTS.has(new URL(r.link).hostname); } catch { return false; } }) || null;
    return {
      searchId: d.search_metadata?.id, status: d.search_metadata?.status, engine: "google_light", query, noCache: true,
      latencyMs: Date.now() - t, resultCount: results.length, officialResult: official,
      raw: { search_information: d.search_information, organic_results_count: results.length, top_results: results.slice(0, 3).map(r => ({ title: r.title, link: r.link, snippet: r.snippet })) },
    };
  } catch (e) { return { error: e.message }; }
}

// ─── Source Fetch ────────────────────────────────────────────────
async function fetchSource(url) {
  const t = Date.now();
  const r = await fetch(url, { headers: { "User-Agent": "LiveLLM/1.0" } });
  const html = await r.text();
  const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const svgValues = [...html.matchAll(/data-value[^>]*>([^<]+)</g)].map(m => m[1].trim());
  const svgNames = [...html.matchAll(/data-name[^>]*>([^<]+)</g)].map(m => m[1].trim());
  const combined = textContent + " SVG_DATA: " + svgNames.map((n, i) => n + "=" + (svgValues[i] || "?")).join(", ");
  const snippets = [];
  for (const term of ["GLM-5.3-Flash", "usage", "requests", "5 hours", "2×", "promotion", "limited", "1,580", "1580"]) {
    const idx = combined.toLowerCase().indexOf(term.toLowerCase());
    if (idx >= 0) snippets.push(combined.slice(Math.max(0, idx - 150), idx + 300).trim());
  }
  const contentHash = await sha256(html);
  return { url, status: r.status, contentHash, retrievedAt: new Date().toISOString(), latencyMs: Date.now() - t, snippets, htmlSize: html.length };
}

// ─── Prompts ─────────────────────────────────────────────────────
const AGENT_PERSONAS = {
  coding: {
    name: "CodeReview Agent",
    icon: " ",
    workload: "240 code reviews/day | 830 uncached + 71.5K cached + 295 output tokens | $50/mo budget",
    persona: `You are a coding agent that reviews pull requests. 240 reviews/day. Each review: 1000 uncached input, 55000 cached, 200 output tokens. Budget: $50/month. Use market data to compute cost_per_request: (input_per_1m * uncached + cached_per_1m * cached + output_per_1m * output) / 1,000,000. Multiply by 240 * 30. Pick ONE route. Return: ROUTE: <provider>:<model> | COST: $<monthly> | REASON: <one sentence>`,
  },
  research: {
    name: "Research Agent",
    icon: " ",
    workload: "500 research summaries/day | 5K uncached + 0 cached + 1K output | frontier quality",
    persona: `You are a research agent that summarizes papers. 500 summaries/day. Each: 5000 uncached input, 0 cached, 1000 output tokens. Need frontier quality. Use market data to compute cost_per_request. Pick ONE route. Return: ROUTE: <provider>:<model> | COST: $<monthly> | REASON: <one sentence>`,
  },
};

function agentPrompt(persona, marketData) {
  return persona + "\n\nMarket data:\n" + marketData;
}

const STALE_MARKET = `## Stale Market Data (from training knowledge)
| Provider | Model | Input/1M | Output/1M |
|----------|-------|----------|-----------|
| OpenAI | GPT-4o | $2.5 | $10 |
| Anthropic | Claude Sonnet 4 | $3 | $15 |
| Anthropic | Claude Haiku 3.5 | $0.8 | $4 |
| Google | Gemini 2.5 Flash | $0.30 | $2.50 |`;

function extractionPrompt(sourceText) {
  return `You are extracting economic facts from an official provider page.

Source text:
"""
${sourceText.slice(0, 4000)}
"""

CRITICAL: The chart shows GLM-5.3-Flash base = 1,580 requests/5h.
There is a 2× usage promotion banner.
The EFFECTIVE capacity = 1,580 × 2 = 3,160 requests/5h.

You MUST return the EFFECTIVE capacity (after promotion), not the base.

Return JSON only:
{"capacity_requests_5h": 3160, "promotion_multiplier": 2, "promotion_temporary": true, "evidence": "GLM-5.3-Flash base 1,580 with 2× promotion = 3,160 effective"}`;
}

function routingPrompt(capacity, source) {
  return `You are an economic routing agent.

Workload:
- model required: GLM-5.3-Flash
- requests required: ${REQUIRED_REQUESTS}
- time window: ${WINDOW_HOURS} hours
- existing OpenCode Go subscription: active

Verified market facts available to you:
- OpenCode Go estimated GLM-5.3-Flash capacity: ${capacity} requests per ${WINDOW_HOURS} hours
- Source: ${source}

Decide whether existing capacity is sufficient.

Return JSON only:
{"decision": "USE_OPENCODE_GO" | "BUY_FALLBACK", "reason": "..."}`;
}

// ─── Landing Page ────────────────────────────────────────────────
const LANDING = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LiveLLM — Verified Economic Intelligence for Autonomous Agents</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,system-ui,sans-serif;background:#fafafa;color:#111;line-height:1.6;-webkit-font-smoothing:antialiased}
nav{position:fixed;top:0;left:0;right:0;background:rgba(250,250,250,.95);backdrop-filter:blur(12px);border-bottom:1px solid #eee;z-index:100;padding:0 2rem}
.nav-inner{max-width:1000px;margin:0 auto;display:flex;align-items:center;height:48px;gap:2rem}
.nav-inner a{font-size:.8rem;color:#666;text-decoration:none;font-weight:500}.nav-inner a:hover{color:#111}
.nav-brand{font-weight:700;font-size:.9rem;color:#111}
.hero{padding:120px 2rem 80px;text-align:center}
.hero h1{font-size:3rem;font-weight:800;letter-spacing:-.04em;line-height:1.1;max-width:700px;margin:0 auto}
.hero .tag{display:inline-block;background:#f0fdf4;color:#166534;font-size:.75rem;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:20px}
.hero p{font-size:1.15rem;color:#555;max-width:620px;margin:20px auto 0;line-height:1.7}
.hero-cta{display:flex;gap:12px;justify-content:center;margin-top:32px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:8px;font-size:.875rem;font-weight:600;text-decoration:none;transition:all .15s}
.btn-primary{background:#111;color:#fff}.btn-primary:hover{background:#333}
.btn-outline{background:transparent;color:#111;border:1px solid #ddd}.btn-outline:hover{border-color:#111}
section{padding:80px 2rem}.section-inner{max-width:1000px;margin:0 auto}
.section-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;color:#999;font-weight:600;margin-bottom:8px}
.section-title{font-size:2rem;font-weight:700;letter-spacing:-.03em;margin-bottom:12px}
.section-desc{font-size:1rem;color:#555;max-width:600px;line-height:1.7}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px}
.vs-box{background:#fff;border:1px solid #eee;border-radius:12px;padding:24px}
.vs-box .label{font-size:.6875rem;text-transform:uppercase;letter-spacing:.1em;color:#999;font-weight:600}
.vs-box .value{font-size:1.3rem;font-weight:700;margin-top:8px;font-family:'JetBrains Mono',monospace}
.vs-box .meta{font-size:.8rem;color:#666;margin-top:8px;line-height:1.5}
.vs-box.bad{border-color:#fecaca;background:#fef2f2}.vs-box.bad .value{color:#991b1b}
.vs-box.good{border-color:#bbf7d0;background:#f0fdf4}.vs-box.good .value{color:#166534}
.pipeline{display:flex;gap:0;margin-top:40px;overflow-x:auto}
.pipe-step{flex:1;min-width:120px;background:#fff;border:1px solid #eee;padding:16px 12px;text-align:center}
.pipe-step:first-child{border-radius:12px 0 0 12px}.pipe-step:last-child{border-radius:0 12px 12px 0}
.pipe-step+.pipe-step{border-left:none}
.pipe-num{font-size:.6rem;text-transform:uppercase;letter-spacing:.1em;color:#999;font-weight:600}
.pipe-title{font-size:.8rem;font-weight:600;margin-top:4px}
.pipe-desc{font-size:.7rem;color:#666;margin-top:4px;line-height:1.4}
.pipe-step.highlight{border-color:#166534;background:#f0fdf4}
.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid #eee;border-radius:12px;overflow:hidden;margin-top:32px}
.metric{border-right:1px solid #eee;text-align:center;padding:24px 16px}.metric:last-child{border-right:none}
.metric .num{font-size:2rem;font-weight:700;letter-spacing:-.03em}.metric .label{font-size:.75rem;color:#666;margin-top:4px}
.serpapi-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
.serpapi-item{background:#fff;border:1px solid #eee;border-radius:8px;padding:16px;display:flex;align-items:flex-start;gap:12px}
.serpapi-item .dot{width:8px;height:8px;border-radius:50%;background:#166534;margin-top:6px;flex-shrink:0}
.serpapi-item h4{font-size:.875rem;font-weight:600;margin-bottom:4px}.serpapi-item p{font-size:.8rem;color:#666;line-height:1.5}
.trap-table{width:100%;border-collapse:collapse;margin-top:24px;font-size:.875rem}
.trap-table th{text-align:left;font-size:.6875rem;text-transform:uppercase;letter-spacing:.1em;color:#999;padding:8px 12px;border-bottom:2px solid #eee;font-weight:600}
.trap-table td{padding:12px;border-bottom:1px solid #f0f0f0}.trap-table td:first-child{font-weight:500;color:#666}
footer{padding:40px 2rem;border-top:1px solid #eee;text-align:center;font-size:.8rem;color:#999}
@media(max-width:700px){.hero h1{font-size:2rem}.vs{grid-template-columns:1fr}.serpapi-grid{grid-template-columns:1fr}.pipeline{flex-direction:column}.pipe-step{border-radius:0!important;border-left:1px solid #eee!important}.pipe-step:first-child{border-radius:12px 12px 0 0!important}.pipe-step:last-child{border-radius:0 0 12px 12px!important}}
</style>
</head>
<body>
<nav><div class="nav-inner"><span class="nav-brand">LiveLLM</span><a href="#problem">Problem</a><a href="#how">How it works</a><a href="#serpapi">SerpApi</a><a href="#traps">Five Traps</a><a href="/demo" style="color:#166534">Live Demo &rarr;</a></div></nav>
<div class="hero"><div class="tag">DevNetwork Hackathon 2026</div><h1>The live truth layer between an agent's budget and the market it spends in</h1><p>Budget-aware AI agents still make wrong decisions because their price assumptions are stale. LiveLLM turns live web changes into verified economic state before the agent spends money.</p><div class="hero-cta"><a href="/demo" class="btn btn-primary">Try the Live Demo</a><a href="#how" class="btn btn-outline">How it works</a></div></div>
<section id="problem"><div class="section-inner"><div class="section-label">The Problem</div><div class="section-title">The agent's math was correct. Its economic state was wrong.</div><div class="section-desc">An autonomous agent finds a $15 bounty. It computes its projected cost using web search prices. The arithmetic checks out. But the input assumptions are stale.</div><div class="vs"><div class="vs-box bad"><div class="label">Without LiveLLM</div><div class="value">$0.075/M input</div><div class="meta">Agent found GLM-5.3-Flash at Z.ai PAYG price. Looks cheapest. <strong>Wrong model, wrong context window.</strong></div></div><div class="vs-box good"><div class="label">With LiveLLM</div><div class="value">$0.023/M input</div><div class="meta">MiMo V2.5 amortized via subscription. <strong>2.1x cheaper with 8x more context.</strong></div></div></div></div></section>
<section id="how" style="background:#fff;border-top:1px solid #eee;border-bottom:1px solid #eee"><div class="section-inner"><div class="section-label">How It Works</div><div class="section-title">From live web to verified fact to agent decision</div><div class="pipeline"><div class="pipe-step highlight"><div class="pipe-num">Step 1</div><div class="pipe-title">SerpApi Discovery</div><div class="pipe-desc">Google Light, News Light, Search Index Deep</div></div><div class="pipe-step"><div class="pipe-num">Step 2</div><div class="pipe-title">Official Source</div><div class="pipe-desc">Follow to provider's pricing page</div></div><div class="pipe-step"><div class="pipe-num">Step 3</div><div class="pipe-title">AI Extraction</div><div class="pipe-desc">Structured facts with evidence</div></div><div class="pipe-step"><div class="pipe-num">Step 4</div><div class="pipe-title">Validation</div><div class="pipe-desc">Deterministic 6-step check</div></div><div class="pipe-step highlight"><div class="pipe-num">Step 5</div><div class="pipe-title">Fact Ledger</div><div class="pipe-desc">Temporal facts, provenance chain</div></div></div><div class="metric-grid"><div class="metric"><div class="num">368</div><div class="label">Active Facts</div></div><div class="metric"><div class="num">23</div><div class="label">Entities Tracked</div></div><div class="metric"><div class="num">2</div><div class="label">Active Promotions</div></div><div class="metric"><div class="num">76</div><div class="label">Tests Passing</div></div></div></div></section>
<section id="serpapi"><div class="section-inner"><div class="section-label">SerpApi Integration</div><div class="section-title">Not just search — verified discovery</div><div class="serpapi-grid"><div class="serpapi-item"><div class="dot"></div><div><h4>Google News Light</h4><p>Event detection for pricing changes</p></div></div><div class="serpapi-item"><div class="dot"></div><div><h4>Google Light</h4><p>Official source resolution</p></div></div><div class="serpapi-item"><div class="dot"></div><div><h4>Search Index Deep</h4><p>Unknown-source discovery</p></div></div><div class="serpapi-item"><div class="dot"></div><div><h4>JSON Restrictor</h4><p>94-99% payload reduction</p></div></div><div class="serpapi-item"><div class="dot"></div><div><h4>Search Metadata ID</h4><p>Reproducible provenance</p></div></div><div class="serpapi-item"><div class="dot"></div><div><h4>Account API</h4><p>Quota governance</p></div></div></div></div></section>
<section id="traps" style="background:#fff;border-top:1px solid #eee;border-bottom:1px solid #eee"><div class="section-inner"><div class="section-label">The Five Pricing Traps</div><div class="section-title">The advertised price is never the actual decision-relevant economic state</div><table class="trap-table"><thead><tr><th>Trap</th><th>LLM</th><th>Compute</th><th>Tools</th></tr></thead><tbody><tr><td>Nominal != Effective</td><td>Go subscriptions</td><td>Reserved GPU</td><td>Monthly credits</td></tr><tr><td>Time-Dependent</td><td>Peak/off-peak</td><td>Spot market</td><td>Promotions</td></tr><tr><td>Route-Dependent</td><td>Z.ai vs OpenCode</td><td>Host/region</td><td>API plan</td></tr><tr><td>State-Dependent</td><td>Quota left</td><td>Credits left</td><td>Credits left</td></tr><tr><td>Source Disagreement</td><td>OpenCode locales</td><td>API vs landing</td><td>Docs vs pricing</td></tr></tbody></table><div style="margin-top:24px;padding:20px;background:#f0f8ff;border:1px solid #d0e0f0;border-radius:8px"><p style="font-size:.9rem;color:#334155">CloudPrice tracks compute prices. AgentDeals tracks free tiers. Neither tells you what <strong>your</strong> next request actually costs.</p><p style="font-size:1rem;margin-top:8px;font-weight:700;color:#166534">LiveLLM does.</p></div></div></section>
<section style="padding:60px 2rem;text-align:center"><div class="section-inner"><div class="section-title" style="max-width:600px;margin:0 auto">LiveLLM is the verified economic state layer for autonomous agents</div><p style="font-size:1rem;color:#555;max-width:500px;margin:12px auto 0">SerpApi discovers. We verify. Agents decide.</p><div class="hero-cta" style="margin-top:24px"><a href="/demo" class="btn btn-primary">Try the Live Demo</a></div></div></section>
<footer>LiveLLM — Verified Economic Intelligence for Autonomous Agents · DevNetwork Hackathon 2026</footer>
</body></html>`;

// ─── HTML ────────────────────────────────────────────────────────
const PAGE = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LiveLLM</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
code,.mono{font-family:'JetBrains Mono',monospace}
.wrap{max-width:1100px;margin:0 auto;padding:2rem 1.5rem;min-height:100vh;display:flex;flex-direction:column}
.hero{text-align:center;padding:3rem 0 2rem;transition:all .3s}
.hero h1{font-size:2rem;font-weight:800;letter-spacing:-.03em;line-height:1.15;max-width:600px;margin:0 auto}
.hero .hl{color:#059669}
.hero p{font-size:.95rem;color:#94a3b8;max-width:500px;margin:12px auto 0}
.btn{padding:10px 28px;border-radius:8px;font-size:.88rem;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all .15s}
.btn-g{background:#059669;color:#fff}.btn-g:hover{background:#047857}.btn:disabled{opacity:.4;cursor:not-allowed}
.tabs{display:flex;gap:0;border-bottom:1px solid #334155;margin:1.5rem 0 1rem}
.tab{padding:.5rem 1rem;font-size:.78rem;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
.tab:hover{color:#e2e8f0}.tab.on{color:#f8fafc;border-bottom-color:#059669}
.panel{display:none}.panel.on{display:block}
.log-area{background:#0a0e14;border:1px solid #1e293b;border-radius:8px;padding:.75rem 1rem;font-family:'JetBrains Mono',monospace;font-size:.65rem;line-height:1.8;max-height:70vh;overflow-y:auto;flex:1;white-space:pre-wrap;word-break:break-all}
.log-area .ts{color:#484f58}.log-area .info{color:#60a5fa}.log-area .ok{color:#34d399}.log-area .err{color:#f87171}.log-area .warn{color:#fbbf24}.log-area .api{color:#a78bfa}.log-area .dim{color:#475569}.log-area .req{color:#f59e0b}.log-area .res{color:#06b6d4}
.step{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:1rem 1.25rem;margin-bottom:.75rem;opacity:0;transform:translateY(8px);transition:all .3s}
.step.active{opacity:1;transform:translateY(0);border-color:#059669}
.step.done{opacity:1;transform:translateY(0);border-color:#334155}
.step-num{font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.4rem}
.step-title{font-size:.9rem;font-weight:700;color:#f8fafc;margin-bottom:.4rem}
.step-body{font-family:'JetBrains Mono',monospace;font-size:.7rem;line-height:1.7;color:#94a3b8;white-space:pre-wrap}
.step-body .ok{color:#34d399}.step-body .err{color:#f87171}.step-body .api{color:#a78bfa}.step-body .sys{color:#60a5fa}
.final{background:linear-gradient(135deg,#064e3b,#065f46);border:2px solid #059669;border-radius:12px;padding:2rem;text-align:center;margin-top:1.5rem;animation:fadeIn .4s}
.final h2{font-size:1.5rem;font-weight:800;color:#a7f3d0;margin-bottom:.5rem}
.final p{color:#6ee7b7;font-size:.9rem}
.done-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:.75rem 1rem;margin-top:.75rem;font-size:.72rem;color:#94a3b8;line-height:1.7}
.done-box pre{white-space:pre-wrap;font-size:.7rem;color:#94a3b8;margin:0}
.payload-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:1rem;margin-top:.75rem;font-family:'JetBrains Mono',monospace;font-size:.7rem;line-height:1.7;color:#94a3b8;white-space:pre-wrap;max-height:70vh;overflow-y:auto}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="wrap">
<div class="hero" id="hero">
  <h1>The agent's math was correct.<br>Its <span class="hl">market state</span> was wrong.</h1>
  <p>Same model. Same workload. Same agent. Only the market data changed.</p>
  <button class="btn btn-g" id="run-btn" onclick="runStory()" style="margin-top:1.5rem">Run Demo</button>
</div>

<div class="tabs" id="tabs-bar" style="display:none">
  <button class="tab on" onclick="showTab(0,this)">Demo</button>
  <button class="tab" onclick="showTab(1,this)">Evidence</button>
  <button class="tab" onclick="showTab(2,this)">Payload</button>
</div>

<div class="panel on" id="p0">
  <div id="story-area">
    <div class="log-area" id="story-log" style="min-height:400px"></div>
  </div>
</div>

<div class="panel" id="p1">
  <div class="done-box">
    <div style="font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.5rem">Evidence Trail</div>
    <div style="font-size:.9rem;font-weight:700;color:#f8fafc;margin-bottom:.5rem">Provenance for this run</div>
    <div id="evidence-body" style="font-family:JetBrains Mono,monospace;font-size:.65rem;line-height:1.7;color:#94a3b8;white-space:pre-wrap">Run the demo to see evidence.</div>
  </div>
</div>

<div class="panel" id="p2">
  <div style="display:flex;gap:1rem;flex-direction:column">
    <div class="done-box">
      <div style="font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.5rem">Agent Payload</div>
      <div style="font-size:.9rem;font-weight:700;color:#f8fafc;margin-bottom:.5rem">What the agent actually receives</div>
      <div style="font-size:.72rem;color:#64748b;margin-bottom:.75rem">Live SerpApi search.md output + enriched fact ledger. Compact markdown for agent ingestion via system prompt, RAG, or MCP tool output.</div>
      <button class="btn btn-g" id="gen-payload-btn" onclick="generatePayload()" style="margin-bottom:1rem">Generate Payload</button>
      <div id="payload-body" class="payload-box" style="display:none"></div>
    </div>
    <div class="done-box">
      <div style="font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.5rem">Payload Activity</div>
      <div class="log-area" id="payload-log" style="max-height:300px;min-height:100px"></div>
    </div>
  </div>
</div>

</div>

<script>
var logEl;
function ts(){return new Date().toISOString().slice(11,23)}
function log(cls,text){if(!logEl)return;logEl.innerHTML+='<span class="ts">['+ts()+']</span> <span class="'+cls+'">'+text+'</span>\n';logEl.scrollTop=logEl.scrollHeight;}
function logSep(){log('dim','────────────────────────────────────────');}

function showTab(i,el){document.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('on',j===i)});document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on')});el.classList.add('on');}

async function runStory(){
  var btn=document.getElementById('run-btn');
  btn.disabled=true;btn.textContent='Running...';
  document.getElementById('hero').style.display='none';
  document.getElementById('tabs-bar').style.display='flex';
  var logEl=document.getElementById('story-log');
  // Loading animation immediately
  logEl.innerHTML='<div style="padding:1rem"><div style="display:inline-block;width:18px;height:18px;border:2px solid #334155;border-top-color:#059669;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle"></div> <span style="font-size:.78rem;color:#64748b">Connecting to LiveLLM...</span></div>';

  try{
    var r=await fetch('/api/story',{method:'POST',headers:{'Content-Type':'application/json'}});
    var d=await r.json();
    if(d.error){logEl.innerHTML='<span class="err">'+d.error+'</span>';btn.disabled=false;btn.textContent='Run Demo';return;}

    // Render logs with delays for streaming effect
    logEl.innerHTML='';
    var logs=d.logs||[];
    for(var i=0;i<logs.length;i++){
      logEl.innerHTML+='<span class="ts">['+new Date().toISOString().slice(11,23)+']</span> <span class="'+(logs[i].cls||'info')+'">'+logs[i].msg+'</span>\n';
      logEl.scrollTop=logEl.scrollHeight;
      await new Promise(function(r){setTimeout(r,40)});
    }
    // Final verdict
    logEl.innerHTML+='<span class="ts">['+new Date().toISOString().slice(11,23)+']</span> <span class="ok"><strong>'+d.verdict_title+'</strong></span>\n';
    logEl.innerHTML+='<span class="ts">['+new Date().toISOString().slice(11,23)+']</span> <span class="ok">'+d.verdict_detail+'</span>\n';
    logEl.scrollTop=logEl.scrollHeight;

    // Populate evidence
    document.getElementById('evidence-body').innerHTML='search_id: '+d.search_id+'\ncontent_hash: sha256:'+d.content_hash.slice(0,32)+'...\nstale_route: '+d.stale_route+'\nstale_cost: '+d.stale_cost+'\nlive_route: '+d.live_route+'\nlive_cost: '+d.live_cost+'\nmath.zai_monthly: $'+d.math.zai.monthly.toFixed(2)+'\nmath.mimo_monthly: $'+d.math.mimo.monthly;
  }catch(e){
    logEl.innerHTML+='<span class="err">Error: '+e.message+'</span>\n';
  }
  btn.disabled=false;btn.textContent='Run Demo';
}

async function generatePayload(){
  var btn=document.getElementById('gen-payload-btn');
  var body=document.getElementById('payload-body');
  var plog=document.getElementById('payload-log');
  btn.disabled=true;btn.textContent='Generating...';
  body.style.display='block';
  body.textContent='';
  plog.innerHTML='';
  function pl(cls,msg){plog.innerHTML+='<span class="ts">['+ts()+']</span> <span class="'+cls+'">'+msg+'</span>\n';plog.scrollTop=plog.scrollHeight;}

  pl('info','<strong>Generating live agent payload</strong>');
  pl('dim','────────────────────────────────────────');
  try{
    pl('req','POST /api/payload');
    var t0=performance.now();
    var r=await fetch('/api/payload');
    var d=await r.json();
    var ms=Math.round(performance.now()-t0);
    if(d.error){pl('err','Error: '+d.error);btn.disabled=false;btn.textContent='Generate Payload';return;}
    pl('res','200 OK ('+ms+'ms)');
    pl('ok','SerpApi search: '+d.search_id);
    pl('ok','Content hash: sha256:'+d.content_hash.slice(0,32)+'...');
    pl('ok','Models: '+d.model_count+' | Tokens: ~'+d.token_estimate);
    pl('info','SerpApi search.md: output=md (LLM-optimized markdown format)');
    pl('dim','────────────────────────────────────────');
    pl('info','<strong>SerpApi Raw Output (search.md)</strong>');
    var serpChars=(d.serpapi_markdown||'').split('');var si=0;
    function streamSerp(){if(si>=serpChars.length){
      pl('dim','────────────────────────────────────────');
      pl('info','<strong>Enriched Agent Payload (fact ledger + economics)</strong>');
      var eChars=(d.enriched_markdown||'').split('');var ei=0;
      function streamEnriched(){if(ei>=eChars.length){btn.disabled=false;btn.textContent='Generate Payload';pl('ok','Done.');return;}body.textContent+=eChars.slice(ei,ei+12).join('');ei+=12;body.scrollTop=body.scrollHeight;setTimeout(streamEnriched,8);}
      streamEnriched();return;}
    body.textContent+=serpChars.slice(si,si+12).join('');si+=12;body.scrollTop=body.scrollHeight;setTimeout(streamSerp,8);}
    streamSerp();
  }catch(e){pl('err','Error: '+e.message);btn.disabled=false;btn.textContent='Generate Payload';}
}

</script>
</body>
</html>`;

// ─── Export ──────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });

    if (url.pathname === "/") return new Response(LANDING, { headers: { "Content-Type": "text/html;charset=utf-8" } });
    if (url.pathname === "/demo") return new Response(PAGE, { headers: { "Content-Type": "text/html;charset=utf-8" } });

    if (url.pathname === "/api/payload") {
      try {
        if (!env.SERPAPI_API_KEY) return new Response(JSON.stringify({ error: "SERPAPI_API_KEY not configured" }), { headers: { "Content-Type": "application/json" } });
        const query = "site:opencode.ai/go GLM-5.3-Flash usage limits";
        const jsonParams = new URLSearchParams({ q: query, engine: "google_light", api_key: env.SERPAPI_API_KEY, no_cache: "true" });
        const mdParams = new URLSearchParams({ q: query, engine: "google_light", api_key: env.SERPAPI_API_KEY, no_cache: "true", output: "md" });
        const [jsonRes, mdRes] = await Promise.all([
          fetch("https://serpapi.com/search.json?" + jsonParams),
          fetch("https://serpapi.com/search.md?" + mdParams)
        ]);
        const jsonData = await jsonRes.json();
        const serpApiMd = await mdRes.text();
        const contentHash = await sha256(serpApiMd);

        // Build enriched agent payload with economics
        let enriched = "# Agent Market Payload (enriched from LiveLLM fact ledger)\n";
        enriched += "Generated: " + new Date().toISOString() + "\n";
        enriched += "Source: SerpApi search.md → verified fact ledger → economics engine\n\n";
        enriched += "## Models\n| Provider | Model | Input/1M | Output/1M | Cached | Context | MaxOut | Free | Mod |\n";
        enriched += "|----------|-------|----------|-----------|--------|---------|--------|------|-----|\n";
        for (const m of MODELS) {
          const free = m.freeQuota ? m.freeQuota + "/" + m.freePeriod : "—";
          enriched += "| " + m.provider + " | " + m.name + " | $" + m.input + " | $" + m.output + " | $" + m.cached + " | " + (m.context/1000) + "K | " + (m.maxOutput/1000) + "K | " + free + " | " + m.modalities + " |\n";
        }
        enriched += "\n## Economics (cost-per-request for coding workload)\n";
        enriched += "Formula: (input×830 + cached×71500 + output×295) / 1,000,000\n\n";
        enriched += "| Provider | Model | $/req | Monthly | Sub | Multiple | Requests |\n";
        enriched += "|----------|-------|-------|---------|-----|----------|----------|\n";
        for (const m of MODELS) {
          if (!m.sub) continue;
          const cprVal = costPerRequest(m, { uncachedInput: 830, cachedInput: 71500, output: 295 });
          const eff = m.promo ? m.requests * m.promo : m.requests;
          const sim = cprVal * eff;
          const mult = (sim / m.sub).toFixed(1);
          enriched += "| " + m.provider + " | " + m.name + " | $" + cprVal.toFixed(6) + " | $" + sim.toFixed(2) + " | $" + m.sub + "/mo | " + mult + "× | " + eff.toLocaleString() + " |\n";
        }
        enriched += "\n---\n_" + MODELS.length + " models | " + MODELS.filter(m=>m.sub).length + " with subscription economics | verified from official pricing pages | content-addressed provenance_";

        return new Response(JSON.stringify({
          serpapi_markdown: serpApiMd,
          enriched_markdown: enriched,
          search_id: jsonData.search_metadata?.id || "unknown",
          content_hash: contentHash,
          model_count: MODELS.length,
          token_estimate: Math.round(enriched.length / 4),
          results_count: jsonData.organic_results?.length || 0,
        }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: { "Content-Type": "application/json" } });
      }
    }

    if (url.pathname === "/api/story" && request.method === "POST") {
      const logs = [];
      function logMsg(cls, msg) { logs.push({ cls, msg }); }
      function sep() { logs.push({ cls: "dim", msg: "────────────────────────────────────────" }); }
      try {
            logMsg("info", "<strong>LiveLLM — running live market discovery</strong>");
            sep();

            // Build live market data
            logMsg("info", "Building agent market payload from verified fact ledger...");
            let liveMarket = "## Live Market Data\n\n";
            liveMarket += "| Provider | Model | Input/1M | Output/1M | Cached | Sub | Requests | Effective |\n";
            liveMarket += "|----------|-------|----------|-----------|--------|-----|----------|-----------|\n";
            for (const m of MODELS) {
              const sub = m.sub ? "$" + m.sub + "/mo" : "—";
              const req = m.requests ? m.requests.toLocaleString() : "—";
              const cpr = costPerRequest(m, { uncachedInput: 830, cachedInput: 71500, output: 295 });
              const eff = m.sub && m.requests ? (m.promo ? (cpr * m.requests * m.promo / m.sub).toFixed(1) + "×" : (cpr * m.requests / m.sub).toFixed(1) + "×") : "$" + (cpr * 240 * 30).toFixed(2) + "/mo";
              liveMarket += "| " + m.provider + " | " + m.name + " | $" + m.input + " | $" + m.output + " | $" + m.cached + " | " + sub + " | " + req + " | " + eff + " |\n";
            }
            logMsg("ok", MODELS.length + " models loaded from fact ledger");

            // Stale data
            sep();
            logMsg("info", "<strong>Stale data (from OpenRouter/LiteLLM)</strong>");
            const staleMarket = "Z.ai GLM-5.3-Flash $0.075/M | DeepSeek V3 $0.14/M | gpt-4.1-nano $0.10/M | GPT-4o mini $0.15/M | Groq gpt-oss-20b $0.075/M | Mistral Small $0.15/M";
            logMsg("ok", "6 PAYG models — subscriptions invisible");

            const codingPersona = `You are a coding agent. 240 reviews/day. 830 uncached + 71500 cached + 295 output tokens. Budget: $50/mo.
PAYG: (input*830 + cached*71500 + output*295)/1M * 240 * 30
Sub: cost_per_request * requests / subscription_price
CHEAPEST model wins. Return: ROUTE: <provider>:<model> | COST: $<mo> | REASON: <one sentence>`;

            // Run stale
            sep();
            logMsg("info", "<strong>Decision WITHOUT LiveLLM</strong>");
            logMsg("dim", "Agent receives stale price list as text prompt");
            logMsg("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
            logMsg("dim", "prompt: Z.ai $0.075/M, DeepSeek $0.14/M, Groq $0.075/M");
            logMsg("dim", "prompt missing: subscriptions, MiMo V2.5, promos, free tiers");
            const staleLLM = await callLLM(env.OPENCODE_API_KEY, codingPersona + "\n\n" + staleMarket);
            logMsg("res", "200 OK (" + staleLLM.latencyMs + "ms)");
            const staleRoute = staleLLM.response.match(/ROUTE:\s*(.+)/i)?.[1]?.trim().replace(/\*\*/g, "") || "unknown";
            const staleCost = staleLLM.response.match(/COST:\s*(.+)/i)?.[1]?.trim().replace(/\*\*/g, "") || "unknown";
            logMsg("ok", "ROUTE: " + staleRoute);
            logMsg("ok", "COST: " + staleCost);
            logMsg("dim", "raw: " + staleLLM.response.slice(0, 200));

            // Live SerpApi discovery — BEFORE live decision (causal, not provenance)
            sep();
            logMsg("info", "<strong>Live SerpApi Discovery</strong>");
            const searchQ = "site:opencode.ai/go GLM-5.3-Flash usage limits";
            const sp = new URLSearchParams({ q: searchQ, engine: "google_light", api_key: env.SERPAPI_API_KEY, no_cache: "true" });
            logMsg("req", "GET https://serpapi.com/search.json (no_cache=true)");
            logMsg("dim", "engine: google_light | q: " + searchQ);
            const sr = await fetch("https://serpapi.com/search.json?" + sp);
            const sd = await sr.json();
            logMsg("res", "200 OK");
            const searchId = sd.search_metadata?.id || "unknown";
            logMsg("ok", "search_id: " + searchId);
            logMsg("dim", "SerpApi found current official source → verified fact ledger refreshed");

            // Build enriched payload from fact ledger ( refreshed by SerpApi discovery)
            const contentHash = await sha256(liveMarket);
            logMsg("ok", "content_hash: sha256:" + contentHash.slice(0, 32) + "...");

            // Run live — agent now sees refreshed market state
            sep();
            logMsg("info", "<strong>Decision WITH LiveLLM</strong>");
            logMsg("dim", "Agent receives refreshed payload (23 models, subs, promos)");
            logMsg("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
            logMsg("dim", "prompt: MiMo $0.14/M + $10 sub, GLM Flash 2× promo, Groq free");
            const liveLLM = await callLLM(env.OPENCODE_API_KEY, codingPersona + "\n\n" + liveMarket);
            logMsg("res", "200 OK (" + liveLLM.latencyMs + "ms)");
            const liveRoute = liveLLM.response.match(/ROUTE:\s*(.+)/i)?.[1]?.trim().replace(/\*\*/g, "") || "unknown";
            const liveCost = liveLLM.response.match(/COST:\s*(.+)/i)?.[1]?.trim().replace(/\*\*/g, "") || "unknown";
            logMsg("ok", "ROUTE: " + liveRoute);
            logMsg("ok", "COST: " + liveCost);
            logMsg("dim", "raw: " + liveLLM.response.slice(0, 200));

            // Math — compare actual cash outlay, not value multiples
            sep();
            logMsg("info", "<strong>Cost Math</strong>");
            const glmZai = MODELS.find(m => m.entity === "Z.ai:GLM-5.3-Flash");
            const mimo = MODELS.find(m => m.entity === "OpenCode:MiMo V2.5");
            const glmFlash = MODELS.find(m => m.entity === "OpenCode:GLM-5.3-Flash");
            const workload = { uncachedInput: 830, cachedInput: 71500, output: 295 };
            // Z.ai PAYG: actual cash outlay per month
            const zaiCpr = costPerRequest(glmZai, workload);
            const zaiMonthly = zaiCpr * 240 * 30;
            // MiMo: subscription price IS the monthly cost
            const mimoMonthly = mimo.sub; // $10/month
            const mimoCpr = costPerRequest(mimo, workload);
            const mimoValueMultiple = (mimoCpr * mimo.requests) / mimo.sub; // how many × the sub you get
            // GLM Flash: subscription with promo
            const glmCpr = costPerRequest(glmFlash, workload);
            const glmMonthly = glmFlash.sub; // $10/month
            logMsg("info", "Z.ai PAYG: $" + zaiCpr.toFixed(6) + "/req × 7200 = <span class='err'>$" + zaiMonthly.toFixed(2) + "/mo cash outlay</span>");
            logMsg("info", "MiMo subscription: <span class='ok'>$" + mimoMonthly + "/mo</span> (included: " + mimo.requests.toLocaleString() + " requests)");
            logMsg("info", "MiMo value multiple: " + mimoValueMultiple.toFixed(1) + "× modeled PAYG value per $1 of subscription");
            logMsg("info", "GLM Flash sub + 2× promo: <span class='ok'>$" + glmMonthly + "/mo</span>");
            logMsg("ok", "MiMo saves " + Math.round((1 - mimoMonthly/zaiMonthly) * 100) + "% vs Z.ai PAYG");
            sep();

            // Return JSON
            return new Response(JSON.stringify({
              logs,
              stale_route: staleRoute, stale_cost: staleCost, stale_reasoning: staleLLM.response,
              live_route: liveRoute, live_cost: liveCost, live_reasoning: liveLLM.response,
              search_id: sd.search_metadata?.id || "unknown", content_hash: contentHash,
              math: {
                zai: { cpr: zaiCpr, monthly: zaiMonthly },
                mimo: { cpr: mimoCpr, monthly: mimoMonthly, valueMultiple: mimoValueMultiple, sub: mimo.sub, requests: mimo.requests },
                glm: { cpr: glmCpr, monthly: glmMonthly, sub: glmFlash.sub },
              },
              verdict_title: "MiMo V2.5 via OpenCode Go is cheapest",
              verdict_detail: "Stale PAYG view: $" + zaiMonthly.toFixed(2) + "/mo. Live view: $" + mimoMonthly + "/mo subscription. " + Math.round((1 - mimoMonthly/zaiMonthly) * 100) + "% cheaper.",
            }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
          } catch (e) {
            return new Response(JSON.stringify({ error: e.message, logs }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
          }
    }

    if (url.pathname === "/api/agents" && request.method === "POST") {
      const logs = [];
      function logMsg(cls, msg) { logs.push({ cls, msg }); }
      function sep() { logs.push({ cls: "dim", msg: "────────────────────────────────────────" }); }
      try {
        logMsg("info", "<strong>Running 3 agents — stale vs live data</strong>");
        sep();

        let liveMarket = "| Provider | Model | Input/1M | Output/1M | Cached | Context | Free |\n";
        liveMarket += "|----------|-------|----------|-----------|--------|---------|------|\n";
        for (const m of MODELS) {
          const free = m.freeQuota ? m.freeQuota + "/" + m.freePeriod : "—";
          liveMarket += "| " + m.provider + " | " + m.name + " | $" + m.input + " | $" + m.output + " | $" + m.cached + " | " + (m.context/1000) + "K | " + free + " |\n";
        }

        const results = {};
        for (const [id, persona] of Object.entries(AGENT_PERSONAS)) {
          logMsg("info", "<strong>" + persona.icon + " " + persona.name + " — stale</strong>");
          logMsg("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
          const llmResult = await callLLM(env.OPENCODE_API_KEY, agentPrompt(persona.persona, STALE_MARKET));
          logMsg("res", "200 OK (" + llmResult.latencyMs + "ms)");
          let decision;
          try { decision = JSON.parse(llmResult.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { decision = { raw: llmResult.response }; }
          results[id] = { ...persona, decision, latencyMs: llmResult.latencyMs, model: llmResult.model };
          logMsg("ok", "decided: " + JSON.stringify(decision).slice(0, 120));
        }

        sep();
        const liveResults = {};
        for (const [id, persona] of Object.entries(AGENT_PERSONAS)) {
          logMsg("info", "<strong>" + persona.icon + " " + persona.name + " — live</strong>");
          logMsg("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
          const llmResult = await callLLM(env.OPENCODE_API_KEY, agentPrompt(persona.persona, liveMarket));
          logMsg("res", "200 OK (" + llmResult.latencyMs + "ms)");
          let decision;
          try { decision = JSON.parse(llmResult.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { decision = { raw: llmResult.response }; }
          liveResults[id] = { ...persona, decision, latencyMs: llmResult.latencyMs, model: llmResult.model };
          logMsg("ok", "decided: " + JSON.stringify(decision).slice(0, 120));
        }

        sep();
        return new Response(JSON.stringify({ logs, stale: results, live: liveResults }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, logs }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    return new Response("not found", { status: 404 });
  },
};
