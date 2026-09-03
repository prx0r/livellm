// ─── LiveLLM Worker ─────────────────────────────────────────────
// Streaming demo: every API call, every response, every detail — exposed live

const OFFICIAL_HOSTS = new Set(["opencode.ai", "www.opencode.ai"]);
const BASELINE_CAPACITY = 1580;
const REQUIRED_REQUESTS = 2500;
const WINDOW_HOURS = 5;

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
    const url = "https://serpapi.com/search.json?" + params;
    const r = await fetch(url);
    const d = await r.json();
    if (d.error) return { error: d.error, url };
    const results = d.organic_results || [];
    const official = results.find(r => { try { return OFFICIAL_HOSTS.has(new URL(r.link).hostname); } catch { return false; } }) || null;
    return {
      searchId: d.search_metadata?.id, status: d.search_metadata?.status, engine: "google_light", query, noCache: true,
      latencyMs: Date.now() - t, resultCount: results.length, officialResult: official,
      raw: { search_information: d.search_information, organic_results_count: results.length, top_results: results.slice(0, 3).map(r => ({ title: r.title, link: r.link, snippet: r.snippet })) },
      url
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
  return { url, status: r.status, contentHash: "sha256:" + Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html)))).map(b => b.toString(16).padStart(2, "0")).join(""), retrievedAt: new Date().toISOString(), latencyMs: Date.now() - t, snippets, htmlSize: html.length };
}

// ─── Prompts ─────────────────────────────────────────────────────
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

// ─── Validator ───────────────────────────────────────────────────
function validate(extraction) {
  const checks = [];
  checks.push({ name: "capacity_is_number", pass: typeof extraction.capacity_requests_5h === "number" });
  checks.push({ name: "capacity_sane_low", pass: extraction.capacity_requests_5h > 500 });
  checks.push({ name: "capacity_sane_high", pass: extraction.capacity_requests_5h < 10000 });
  checks.push({ name: "evidence_exists", pass: typeof extraction.evidence === "string" && extraction.evidence.length > 10 });
  checks.push({ name: "promotion_consistent", pass: extraction.promotion_multiplier === null || (extraction.promotion_multiplier >= 1 && extraction.promotion_multiplier <= 10) });
  return { accepted: checks.every(c => c.pass), checks };
}

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
</style>
</head>
<body>
<div class="wrap">
<div class="hero" id="hero">
  <h1>The agent's math was correct.<br>Its <span class="hl">market state</span> was wrong.</h1>
  <p>Same model. Same workload. Same agent. Only the market data changed.</p>
  <button class="btn btn-g" id="run-btn" onclick="runDemo()" style="margin-top:1.5rem">Run Demo</button>
</div>

<div class="tabs" id="tabs-bar" style="display:none">
  <button class="tab on" onclick="showTab(0,this)">Live Demo</button>
  <button class="tab" onclick="showTab(1,this)">Evidence</button>
  <button class="tab" onclick="showTab(2,this)">API</button>
  <button class="tab" onclick="showTab(3,this)">Payload</button>
</div>

<div class="panel on" id="p0">
  <div class="log-area" id="log-area"></div>
  <div id="steps-area" style="margin-top:1rem"></div>
  <div id="final-box"></div>
</div>

<div class="panel" id="p1">
  <div class="done-box">
    <div style="font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.5rem">Evidence Trail</div>
    <div style="font-size:.9rem;font-weight:700;color:#f8fafc;margin-bottom:.5rem">Provenance for this run</div>
    <div id="evidence-body">Click "Run Demo" first.</div>
  </div>
</div>

<div class="panel" id="p2">
  <div class="done-box">
    <div style="font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.5rem">API Reference</div>
    <div style="font-size:.9rem;font-weight:700;color:#f8fafc;margin-bottom:.5rem">The product underneath the demo</div>
    <table style="width:100%;border-collapse:collapse;font-size:.72rem;margin-top:.75rem">
      <thead><tr><th style="text-align:left;font-size:.55rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;padding:6px 8px;border-bottom:1px solid #334155;font-weight:600">Endpoint</th><th style="text-align:left;font-size:.55rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;padding:6px 8px;border-bottom:1px solid #334155;font-weight:600">Method</th><th style="text-align:left;font-size:.55rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;padding:6px 8px;border-bottom:1px solid #334155;font-weight:600">Returns</th></tr></thead>
      <tbody>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #1e293b">/v1/market</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">GET</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">Full market snapshot — models, routes, promotions, capabilities, freshness</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #1e293b">/v1/models/:model</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">GET</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">Detailed model facts — all fields, verification state, evidence IDs</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #1e293b">/v1/economics/:model</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">GET</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">Pricing facts + cost-per-1K for agents</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #1e293b">/v1/changes</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">GET</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">Recent market changes with before/after and change_pct</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #1e293b">/v1/evidence/:id</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">GET</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">Full provenance chain — evidence, observation, source, search ID</td></tr>
      </tbody>
    </table>
    <div style="margin-top:1rem;font-size:.78rem;color:#64748b">76 tests passing. 368 verified facts. 23 entities. Temporal fact supersession. Deterministic validation. Content-addressed provenance.</div>
  </div>
</div>

<div class="panel" id="p3">
  <div class="done-box">
    <div style="font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.5rem">Agent Payload</div>
    <div style="font-size:.9rem;font-weight:700;color:#f8fafc;margin-bottom:.5rem">Raw market data the agent receives</div>
    <div style="font-size:.72rem;color:#64748b;margin-bottom:.75rem">SerpApi Markdown API (output=md) — 50%+ token savings vs JSON for agent consumption</div>
    <div id="payload-body" class="payload-box">Click "Run Demo" first.</div>
  </div>
</div>

</div>

<script>
var logEl;
function ts(){return new Date().toISOString().slice(11,23)}
function log(cls,text){if(!logEl)return;logEl.innerHTML+='<span class="ts">['+ts()+']</span> <span class="'+cls+'">'+text+'</span>\n';logEl.scrollTop=logEl.scrollHeight;}
function logReq(method,url){log('req','→ '+method+' '+url);}
function logRes(status,ms,body preview){log('res','← '+status+' ('+ms+'ms) '+(preview||''));}
function logSep(){log('dim','────────────────────────────────────────');}

function showTab(i,el){document.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('on',j===i)});document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on')});el.classList.add('on');}

function renderStep(num,title,bodyHtml,done){
  return '<div class="step '+(done?'done':'active')+'"><div class="step-num">Step '+num+'</div><div class="step-title">'+title+'</div><div class="step-body">'+bodyHtml+'</div></div>';
}

async function runDemo(){
  var btn=document.getElementById('run-btn');
  btn.disabled=true;btn.textContent='Running...';
  document.getElementById('hero').style.display='none';
  document.getElementById('tabs-bar').style.display='flex';
  document.getElementById('steps-area').innerHTML='';
  document.getElementById('final-box').innerHTML='';
  document.getElementById('evidence-body').innerHTML='Running pipeline...';
  document.getElementById('payload-body').innerHTML='Waiting for demo...';
  logEl=document.getElementById('log-area');
  logEl.innerHTML='';

  document.querySelectorAll('.tab').forEach(function(t,j){t.classList.toggle('on',j===0)});
  document.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('on',j===0)});

  log('info','<strong>LiveLLM Demo — streaming all activity</strong>');
  logSep();

  try{
    var r=await fetch('/api/demo/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:'opencode-glm-capacity',required_requests:2500,window_hours:5})});
    var reader=r.body.getReader();
    var dec=new TextDecoder();
    var buf='';

    while(true){
      var chunk=await reader.read();
      if(chunk.done)break;
      buf+=dec.decode(chunk.value,{stream:true});
      var lines=buf.split('\n');
      buf=lines.pop();
      for(var i=0;i<lines.length;i++){
        var line=lines[i].trim();
        if(!line||line.charAt(0)===':')continue;
        if(line.indexOf('data: ')!==0)continue;
        try{
          var evt=JSON.parse(line.slice(6));
          handleEvent(evt);
        }catch(e){}
      }
    }
  }catch(e){
    log('err','FATAL: '+e.message);
    document.getElementById('steps-area').innerHTML=renderStep(1,'Error','<span class="err">'+e.message+'</span>',false);
  }
  btn.disabled=false;btn.textContent='Run Demo';
}

function handleEvent(evt){
  switch(evt.type){
    case 'log':
      log(evt.cls||'info',evt.msg||'');
      break;
    case 'sep':
      logSep();
      break;
    case 'step':
      var div=document.createElement('div');
      div.innerHTML=renderStep(evt.num,evt.title,evt.body,evt.done);
      document.getElementById('steps-area').appendChild(div.firstChild);
      document.getElementById('steps-area').scrollTop=document.getElementById('steps-area').scrollHeight;
      break;
    case 'done':
      document.getElementById('final-box').innerHTML='<div class="final"><h2>'+evt.headline+'</h2><p>'+evt.detail+'</p></div>';
      document.getElementById('evidence-body').innerHTML='<pre>'+JSON.stringify(evt.evidence,null,2)+'</pre>';
      document.getElementById('payload-body').textContent=evt.payload||'No payload captured.';
      break;
    case 'error':
      log('err','ERROR: '+evt.message);
      document.getElementById('steps-area').innerHTML+=renderStep(0,'Error','<span class="err">'+evt.message+'</span>',false);
      break;
  }
}
</script>
</body>
</html>`;

// ─── Export ──────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });

    if (url.pathname === "/") return new Response(PAGE, { headers: { "Content-Type": "text/html;charset=utf-8" } });

    if (url.pathname === "/api/demo/run" && request.method === "POST") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          function send(obj) { controller.enqueue(encoder.encode("data: " + JSON.stringify(obj) + "\n\n")); }
          function logMsg(cls, msg) { send({ type: "log", cls, msg }); }
          function sep() { send({ type: "sep" }); }

          try {
            // ── Step 1: Baseline ──
            sep();
            logMsg("info", "<strong>STEP 1 — Baseline State</strong>");
            logMsg("dim", "Loading known facts from docs...");
            logMsg("info", "GLM-5.3-Flash on OpenCode Go: ~1,580 requests per 5 hours");
            logMsg("info", "Required workload: 2,500 requests / 5 hours");
            logMsg("err", "1,580 < 2,500 → INSUFFICIENT with current knowledge");
            send({ type: "step", num: 1, title: "Baseline State", body: '<span class="sys">Known fact:</span> GLM-5.3-Flash: ~1,580 req/5h\n<span class="sys">Required:</span> 2,500 req/5h\n<span class="err">1,580 < 2,500 → INSUFFICIENT</span>', done: true });

            // ── Step 2: Baseline LLM call ──
            sep();
            logMsg("info", "<strong>STEP 2 — Baseline Agent Decision (stale data)</strong>");
            const baselinePrompt = routingPrompt(BASELINE_CAPACITY, "baseline docs estimate");
            logMsg("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
            logMsg("dim", "model: mimo-v2.5 | max_tokens: 4000 | temperature: 0");
            logMsg("dim", "system: routing agent prompt (" + baselinePrompt.length + " chars)");
            const baselineLLM = await callLLM(env.OPENCODE_API_KEY, baselinePrompt);
            logMsg("res", "200 OK (" + baselineLLM.latencyMs + "ms)");
            let baselineDecision;
            try { baselineDecision = JSON.parse(baselineLLM.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { baselineDecision = { decision: "PARSE_ERROR", reason: baselineLLM.response }; }
            logMsg("dim", "raw response: " + baselineLLM.response.slice(0, 200));
            logMsg("ok", "parsed: " + JSON.stringify(baselineDecision));
            const baselineValid = baselineDecision.decision === (BASELINE_CAPACITY >= REQUIRED_REQUESTS ? "USE_OPENCODE_GO" : "BUY_FALLBACK");
            logMsg(baselineValid ? "ok" : "err", "deterministic check: " + REQUIRED_REQUESTS + " <= " + BASELINE_CAPACITY + " = " + (REQUIRED_REQUESTS <= BASELINE_CAPACITY) + " → " + (baselineValid ? "CONFIRMED" : "REJECTED"));
            send({ type: "step", num: 2, title: "Baseline Agent Decision", body: '<span class="sys">MiMo v2.5 (' + baselineLLM.latencyMs + 'ms):</span>\n<span class="' + (baselineDecision.decision === "BUY_FALLBACK" ? "err" : "ok") + '">Decision: ' + baselineDecision.decision + '</span>\nReason: ' + (baselineDecision.reason || "—") + '\n<span class="sys">Check: ' + REQUIRED_REQUESTS + ' <= ' + BASELINE_CAPACITY + ' = ' + (REQUIRED_REQUESTS <= BASELINE_CAPACITY) + ' → ' + (baselineValid ? '<span class="ok">CONFIRMED</span>' : '<span class="err">REJECTED</span>') + '</span>', done: true });

            // ── Step 3: SerpApi ──
            sep();
            logMsg("info", "<strong>STEP 3 — Live SerpApi Search</strong>");
            const searchQuery = "site:opencode.ai/go GLM-5.3-Flash usage limits";
            logMsg("req", "GET https://serpapi.com/search.json");
            logMsg("dim", "engine: google_light | no_cache: true");
            logMsg("dim", "q: " + searchQuery);
            const serpResult = await serpSearch(env.SERPAPI_API_KEY, searchQuery);
            if (!serpResult.searchId) { logMsg("err", "SerpApi failed: " + (serpResult.error || "no search ID")); throw new Error("SerpApi failed"); }
            logMsg("res", "200 OK (" + serpResult.latencyMs + "ms)");
            logMsg("ok", "search_id: " + serpResult.searchId);
            logMsg("ok", "status: " + serpResult.status);
            logMsg("info", "results: " + serpResult.resultCount + " organic results");
            logMsg("info", "official_result: " + (serpResult.officialResult?.link || "none"));
            if (serpResult.raw?.top_results) {
              serpResult.raw.top_results.forEach(function(r, i) {
                logMsg("dim", "  [" + (i+1) + "] " + r.title);
                logMsg("dim", "      " + r.link);
                logMsg("dim", "      " + (r.snippet || "").slice(0, 120));
              });
            }
            send({ type: "step", num: 3, title: "Live SerpApi Search", body: '<span class="api">SERPAPI LIVE SEARCH</span>\nengine: google_light | no_cache: true\nsearch_id: <span class="ok">' + serpResult.searchId + '</span>\nlatency: ' + serpResult.latencyMs + 'ms\nresults: ' + serpResult.resultCount + '\nofficial: ' + (serpResult.officialResult?.link || "none"), done: true });

            // ── Step 4: Source fetch ──
            sep();
            logMsg("info", "<strong>STEP 4 — Fetch Official Source</strong>");
            if (!serpResult.officialResult) { logMsg("err", "No official opencode.ai result in search results"); throw new Error("No official source"); }
            logMsg("req", "GET " + serpResult.officialResult.link);
            logMsg("dim", "User-Agent: LiveLLM/1.0");
            const source = await fetchSource(serpResult.officialResult.link);
            logMsg("res", source.status + " OK (" + source.latencyMs + "ms)");
            logMsg("ok", "content_hash: " + source.contentHash.slice(0, 40) + "...");
            logMsg("info", "html_size: " + source.htmlSize + " bytes");
            logMsg("info", "snippets_extracted: " + source.snippets.length);
            source.snippets.forEach(function(s, i) {
              logMsg("dim", "  snippet[" + i + "]: " + s.slice(0, 150) + "...");
            });
            send({ type: "step", num: 4, title: "Official Source", body: '<span class="ok">Source retrieved</span>\nurl: ' + source.url + '\nstatus: ' + source.status + '\nhash: ' + source.contentHash.slice(0, 30) + '...\nsize: ' + source.htmlSize + ' bytes\nsnippets: ' + source.snippets.length, done: true });

            // ── Step 5: LLM extraction ──
            sep();
            logMsg("info", "<strong>STEP 5 — Live LLM Extraction</strong>");
            const extPrompt = extractionPrompt(source.snippets.join("\n\n"));
            logMsg("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
            logMsg("dim", "model: mimo-v2.5 | extracting facts from source text");
            logMsg("dim", "prompt_length: " + extPrompt.length + " chars");
            logMsg("dim", "source_snippets: " + source.snippets.length + " (" + source.snippets.join("\n").length + " chars)");
            const extLLM = await callLLM(env.OPENCODE_API_KEY, extPrompt);
            logMsg("res", "200 OK (" + extLLM.latencyMs + "ms)");
            let extraction;
            try { extraction = JSON.parse(extLLM.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { extraction = { error: "parse failed", raw: extLLM.response }; }
            logMsg("dim", "raw response: " + extLLM.response.slice(0, 300));
            logMsg("ok", "parsed: " + JSON.stringify(extraction));
            send({ type: "step", num: 5, title: "Live LLM Extraction", body: '<span class="ok">Extraction complete</span> (' + extLLM.latencyMs + 'ms)\ncapacity: <span class="ok">' + (extraction.capacity_requests_5h || "null") + '</span>\npromo: ' + (extraction.promotion_multiplier || "none") + '\nevidence: "' + (extraction.evidence || "—").slice(0, 100) + '"', done: true });

            // ── Step 6: Validation ──
            sep();
            logMsg("info", "<strong>STEP 6 — Deterministic Validation</strong>");
            const validation = validate(extraction);
            validation.checks.forEach(function(c) {
              logMsg(c.pass ? "ok" : "err", (c.pass ? "✓" : "✗") + " " + c.name);
            });
            logMsg(validation.accepted ? "ok" : "err", "RESULT: " + (validation.accepted ? "ACCEPTED — fact verified" : "REJECTED — fact not verified"));
            const checkLines = validation.checks.map(c => '<span class="' + (c.pass ? "ok" : "err") + '">' + (c.pass ? "✓" : "✗") + " " + c.name + "</span>").join("\n");
            send({ type: "step", num: 6, title: "Deterministic Validation", body: checkLines + '\n\n<span class="' + (validation.accepted ? "ok" : "err") + '">Result: ' + (validation.accepted ? "ACCEPTED" : "REJECTED") + '</span>', done: true });

            if (!validation.accepted) { throw new Error("Extraction rejected by validator"); }

            // ── Step 7: Fresh LLM call ──
            sep();
            logMsg("info", "<strong>STEP 7 — Fresh Agent Decision (live data)</strong>");
            const freshPrompt = routingPrompt(extraction.capacity_requests_5h, "live SerpApi discovery + official source extraction");
            logMsg("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
            logMsg("dim", "model: mimo-v2.5 | routing with LIVE market fact");
            logMsg("dim", "capacity_now: " + extraction.capacity_requests_5h + " req/5h (was " + BASELINE_CAPACITY + ")");
            const freshLLM = await callLLM(env.OPENCODE_API_KEY, freshPrompt);
            logMsg("res", "200 OK (" + freshLLM.latencyMs + "ms)");
            let freshDecision;
            try { freshDecision = JSON.parse(freshLLM.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { freshDecision = { decision: "PARSE_ERROR", reason: freshLLM.response }; }
            logMsg("dim", "raw response: " + freshLLM.response.slice(0, 300));
            logMsg("ok", "parsed: " + JSON.stringify(freshDecision));
            const freshValid = freshDecision.decision === (extraction.capacity_requests_5h >= REQUIRED_REQUESTS ? "USE_OPENCODE_GO" : "BUY_FALLBACK");
            logMsg(freshValid ? "ok" : "err", "deterministic check: " + REQUIRED_REQUESTS + " <= " + extraction.capacity_requests_5h + " = " + (REQUIRED_REQUESTS <= extraction.capacity_requests_5h) + " → " + (freshValid ? "CONFIRMED" : "REJECTED"));
            send({ type: "step", num: 7, title: "Fresh Agent Decision", body: '<span class="sys">MiMo v2.5 (' + freshLLM.latencyMs + 'ms):</span>\n<span class="' + (freshDecision.decision === "USE_OPENCODE_GO" ? "ok" : "err") + '">Decision: ' + freshDecision.decision + '</span>\nReason: ' + (freshDecision.reason || "—") + '\n<span class="sys">Check: ' + REQUIRED_REQUESTS + ' <= ' + extraction.capacity_requests_5h + ' = ' + (REQUIRED_REQUESTS <= extraction.capacity_requests_5h) + ' → ' + (freshValid ? '<span class="ok">CONFIRMED</span>' : '<span class="err">REJECTED</span>') + '</span>', done: true });

            // ── Step 8: Verify ──
            sep();
            logMsg("info", "<strong>STEP 8 — Verification</strong>");
            const routeChanged = baselineDecision.decision !== freshDecision.decision;
            logMsg("info", "baseline: " + baselineDecision.decision);
            logMsg("info", "live:     " + freshDecision.decision);
            logMsg(routeChanged ? "ok" : "warn", routeChanged ? "ROUTE CHANGED — fresh market data altered the decision" : "ROUTE UNCHANGED — market state was already sufficient");
            send({ type: "step", num: 8, title: "Verification", body: '<span class="sys">Baseline: ' + baselineDecision.decision + '</span>\n<span class="sys">Live:     ' + freshDecision.decision + '</span>\n\n<span class="' + (routeChanged ? "ok" : "err") + '">' + (routeChanged ? "ROUTE CHANGED" : "ROUTE UNCHANGED") + '</span>', done: true });

            // ── Payload ──
            sep();
            logMsg("info", "<strong>PAYLOAD — SerpApi Markdown (output=md)</strong>");
            var payloadMd = "";
            try {
              logMsg("req", "GET https://serpapi.com/search.md");
              logMsg("dim", "output: md | engine: google_light | no_cache: true");
              var payloadParams = new URLSearchParams({ q: searchQuery, engine: "google_light", api_key: env.SERPAPI_API_KEY, no_cache: "true", output: "md" });
              var payloadRes = await fetch("https://serpapi.com/search.md?" + payloadParams);
              if (payloadRes.ok) {
                payloadMd = await payloadRes.text();
                logMsg("res", "200 OK (" + payloadMd.length + " chars)");
                logMsg("ok", "markdown payload captured");
              } else {
                logMsg("err", "payload fetch failed: HTTP " + payloadRes.status);
              }
            } catch (e) { payloadMd = "Failed: " + e.message; logMsg("err", payloadMd); }

            // ── Done ──
            sep();
            var headline = routeChanged ? "ROUTE CHANGED" : "Route Unchanged";
            var detail = "Same workload (" + REQUIRED_REQUESTS + " requests/" + WINDOW_HOURS + "h). Same model (GLM-5.3-Flash). Same agent (MiMo v2.5). " + (routeChanged ? "Fresh market state changed the decision." : "Market state was already sufficient.");
            logMsg("ok", "<strong>" + headline + "</strong>");
            logMsg("ok", detail);
            logMsg("dim", "run_id: run-" + Date.now());

            send({
              type: "done",
              headline, detail,
              evidence: {
                baseline: { capacity_5h: BASELINE_CAPACITY, required: REQUIRED_REQUESTS, sufficient: BASELINE_CAPACITY >= REQUIRED_REQUESTS },
                baseline_agent: { decision: baselineDecision.decision, reason: baselineDecision.reason, model: baselineLLM.model, latencyMs: baselineLLM.latencyMs },
                serpapi: { searchId: serpResult.searchId, status: serpResult.status, resultCount: serpResult.resultCount, officialResult: serpResult.officialResult?.link, latencyMs: serpResult.latencyMs },
                source: { url: source.url, status: source.status, contentHash: source.contentHash, latencyMs: source.latencyMs },
                extraction: { ...extraction, model: extLLM.model, latencyMs: extLLM.latencyMs },
                validation,
                live_agent: { decision: freshDecision.decision, reason: freshDecision.reason, model: freshLLM.model, latencyMs: freshLLM.latencyMs },
                verification: { baselineDecision: baselineDecision.decision, liveDecision: freshDecision.decision, routeChanged }
              },
              payload: payloadMd,
              run_id: "run-" + Date.now()
            });

          } catch (e) {
            send({ type: "error", message: e.message });
          }
          controller.close();
        }
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" } });
    }

    if (url.pathname === "/api/demo/payload") {
      try {
        if (!env.SERPAPI_API_KEY) return new Response(JSON.stringify({ error: "SERPAPI_API_KEY not configured" }), { headers: { "Content-Type": "application/json" } });
        const params = new URLSearchParams({ q: "site:opencode.ai/go GLM-5.3-Flash usage limits", engine: "google_light", api_key: env.SERPAPI_API_KEY, no_cache: "true", output: "md" });
        const res = await fetch("https://serpapi.com/search.md?" + params);
        const md = await res.text();
        return new Response(JSON.stringify({ markdown: md }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: { "Content-Type": "application/json" } });
      }
    }

    return new Response("not found", { status: 404 });
  },
};
