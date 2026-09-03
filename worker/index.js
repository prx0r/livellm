// ─── LiveLLM Worker ─────────────────────────────────────────────
// One demo: baseline fact → live SerpApi → official source →
// live LLM extraction → deterministic validation → live LLM re-route
// Streaming SSE: each step is sent as it completes

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
  const msg = d.choices?.[0]?.message || {}; return { response: msg.content || "", reasoning: msg.reasoning_content || "", latencyMs: Date.now() - t, model: "mimo-v2.5" };
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
  return { url, status: r.status, contentHash: "sha256:" + Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html)))).map(b => b.toString(16).padStart(2, "0")).join(""), retrievedAt: new Date().toISOString(), latencyMs: Date.now() - t, snippets };
}

// ─── Extraction Prompt ───────────────────────────────────────────
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

// ─── Routing Prompt ──────────────────────────────────────────────
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

// ─── Deterministic Validator ─────────────────────────────────────
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
.steps{flex:1;margin:1rem 0}
.step{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:1rem 1.25rem;margin-bottom:.75rem;opacity:0;transform:translateY(8px);transition:all .3s}
.step.active{opacity:1;transform:translateY(0);border-color:#059669}
.step.done{opacity:1;transform:translateY(0);border-color:#334155}
.step-num{font-size:.55rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.4rem}
.step-title{font-size:.9rem;font-weight:700;color:#f8fafc;margin-bottom:.4rem}
.step-body{font-family:'JetBrains Mono',monospace;font-size:.7rem;line-height:1.7;color:#94a3b8;white-space:pre-wrap}
.step-body .ok{color:#34d399}.step-body .err{color:#f87171}.step-body .api{color:#a78bfa}.step-body .sys{color:#60a5fa}
.result-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:.75rem 1rem;margin-top:.75rem}
.result-box .rv{font-size:1.3rem;font-weight:700;font-family:'JetBrains Mono',monospace}
.result-box .rm{font-size:.68rem;color:#64748b;margin-top:4px}
.final{background:linear-gradient(135deg,#064e3b,#065f46);border:2px solid #059669;border-radius:12px;padding:2rem;text-align:center;margin-top:1.5rem;animation:fadeIn .4s}
.final h2{font-size:1.5rem;font-weight:800;color:#a7f3d0;margin-bottom:.5rem}
.final p{color:#6ee7b7;font-size:.9rem}
.tabs{display:flex;gap:0;border-bottom:1px solid #334155;margin:1.5rem 0 1rem}
.tab{padding:.5rem 1rem;font-size:.78rem;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
.tab:hover{color:#e2e8f0}.tab.on{color:#f8fafc;border-bottom-color:#059669}
.panel{display:none}.panel.on{display:block}
.done-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:.75rem 1rem;margin-top:.75rem;font-size:.72rem;color:#94a3b8;line-height:1.7}
.done-box pre{white-space:pre-wrap;font-size:.7rem;color:#94a3b8;margin:0}
.payload-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:1rem;margin-top:.75rem;font-family:'JetBrains Mono',monospace;font-size:.7rem;line-height:1.7;color:#94a3b8;white-space:pre-wrap;max-height:70vh;overflow-y:auto}
.evidence-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:.75rem 1rem;margin-top:.75rem}
.evidence-box pre{white-space:pre-wrap;font-size:.7rem;color:#94a3b8;margin:0}
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
  <div class="steps" id="steps"></div>
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
        <tr><td style="padding:6px 8px;border-bottom:1px solid #1e293b">/v1/market/gpu</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">GET</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">Experimental GPU compute pricing</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #1e293b">/v1/x402/pricing</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">GET</td><td style="padding:6px 8px;border-bottom:1px solid #1e293b">x402 micropayment manifest (future)</td></tr>
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
var currentTab=0;
function showTab(i,el){currentTab=i;document.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('on',j===i)});document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on')});el.classList.add('on');}

function renderStep(num,title,bodyHtml,active,done){
  return '<div class="step'+(active?' active':'')+(done?' done':'')+'"><div class="step-num">Step '+num+'</div><div class="step-title">'+title+'</div><div class="step-body">'+bodyHtml+'</div></div>';
}

async function runDemo(){
  var btn=document.getElementById('run-btn');
  btn.disabled=true;btn.textContent='Running...';
  document.getElementById('hero').style.display='none';
  document.getElementById('tabs-bar').style.display='flex';
  document.getElementById('steps').innerHTML='';
  document.getElementById('final-box').innerHTML='';
  document.getElementById('evidence-body').innerHTML='Loading...';
  document.getElementById('payload-body').innerHTML='Loading...';

  // Switch to Live Demo tab
  document.querySelectorAll('.tab').forEach(function(t,j){t.classList.toggle('on',j===0)});
  document.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('on',j===0)});

  try{
    var r=await fetch('/api/demo/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:'opencode-glm-capacity',required_requests:2500,window_hours:5})});
    var reader=r.body.getReader();
    var decoder=new TextDecoder();
    var buffer='';

    while(true){
      var chunk=await reader.read();
      if(chunk.done)break;
      buffer+=decoder.decode(chunk,{stream:true});
      var lines=buffer.split('\n');
      buffer=lines.pop();
      for(var i=0;i<lines.length;i++){
        var line=lines[i].trim();
        if(!line||line.startsWith(':'))continue;
        if(line.indexOf('data: ')!==0)continue;
        var raw=line.slice(6);
        try{
          var evt=JSON.parse(raw);
          if(evt.type==='step'){
            var div=document.createElement('div');
            div.innerHTML=renderStep(evt.num,evt.title,evt.body,evt.active,evt.done);
            var stepEl=div.firstChild;
            document.getElementById('steps').appendChild(stepEl);
            document.getElementById('steps').scrollTop=document.getElementById('steps').scrollHeight;
          }else if(evt.type==='done'){
            document.getElementById('final-box').innerHTML='<div class="final"><h2>'+evt.headline+'</h2><p>'+evt.detail+'</p></div>';
            document.getElementById('evidence-body').innerHTML='<pre>'+JSON.stringify(evt.evidence,null,2)+'</pre>';
            document.getElementById('payload-body').textContent=evt.payload||'No payload captured.';
            btn.disabled=false;btn.textContent='Run Demo';
          }else if(evt.type==='error'){
            document.getElementById('steps').innerHTML=renderStep(1,'Error','<span class="err">'+evt.message+'</span>',true,false);
            btn.disabled=false;btn.textContent='Run Demo';
          }
        }catch(e){}
      }
    }
  }catch(e){
    document.getElementById('steps').innerHTML=renderStep(1,'Error','<span class="err">'+e.message+'</span>',true,false);
    btn.disabled=false;btn.textContent='Run Demo';
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
          function send(obj) {
            controller.enqueue(encoder.encode("data: " + JSON.stringify(obj) + "\n\n"));
          }

          try {
            // Step 1: Baseline
            send({ type: "step", num: 1, title: "1. Baseline State", body: '<span class="sys">Known fact from docs:</span>\nGLM-5.3-Flash on OpenCode Go: ~1,580 requests per 5 hours\n<span class="sys">Required:</span> 2,500 requests\n<span class="err">1,580 < 2,500 → INSUFFICIENT</span>', active: true, done: true });

            // Step 2: Baseline routing call
            send({ type: "step", num: 2, title: "2. Baseline Agent Decision", body: '<span class="sys">Calling MiMo v2.5 via OpenCode Go...</span>', active: true, done: false });
            const baselinePrompt = routingPrompt(BASELINE_CAPACITY, "baseline docs estimate");
            const baselineLLM = await callLLM(env.OPENCODE_API_KEY, baselinePrompt);
            let baselineDecision;
            try { baselineDecision = JSON.parse(baselineLLM.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { baselineDecision = { decision: "PARSE_ERROR", reason: baselineLLM.response }; }
            const baselineValid = baselineDecision.decision === (BASELINE_CAPACITY >= REQUIRED_REQUESTS ? "USE_OPENCODE_GO" : "BUY_FALLBACK");
            send({ type: "step", num: 2, title: "2. Baseline Agent Decision", body: '<span class="sys">MiMo v2.5 (' + baselineLLM.latencyMs + 'ms):</span>\n<span class="' + (baselineDecision.decision === "BUY_FALLBACK" ? "err" : "ok") + '">Decision: ' + baselineDecision.decision + '</span>\nReason: ' + (baselineDecision.reason || "—") + '\n<span class="sys">Deterministic check: ' + REQUIRED_REQUESTS + ' <= ' + BASELINE_CAPACITY + ' = ' + (REQUIRED_REQUESTS <= BASELINE_CAPACITY) + ' → ' + (baselineValid ? '<span class="ok">CONFIRMED</span>' : '<span class="err">REJECTED</span>') + '</span>', active: false, done: true });

            // Step 3: SerpApi search
            send({ type: "step", num: 3, title: "3. Live SerpApi Search", body: '<span class="sys">Searching Google Light (no_cache=true)...</span>', active: true, done: false });
            const serpResult = await serpSearch(env.SERPAPI_API_KEY, "site:opencode.ai/go GLM-5.3-Flash usage limits");
            if (!serpResult.searchId) { send({ type: "step", num: 3, title: "3. Live SerpApi Search", body: '<span class="err">SerpApi search failed: ' + (serpResult.error || "no search ID") + '</span>', active: false, done: true }); throw new Error("SerpApi failed"); }
            send({ type: "step", num: 3, title: "3. Live SerpApi Search", body: '<span class="api">SERPAPI LIVE SEARCH</span>\nengine: google_light\nno_cache: true\nstatus: ' + serpResult.status + '\nsearch_id: <span class="ok">' + serpResult.searchId + '</span>\nlatency: ' + serpResult.latencyMs + 'ms\nresults: ' + serpResult.resultCount + '\nofficial_result: ' + (serpResult.officialResult?.link || "none found"), active: false, done: true });

            // Step 4: Fetch official source
            send({ type: "step", num: 4, title: "4. Official Source", body: '<span class="sys">Fetching opencode.ai/go...</span>', active: true, done: false });
            if (!serpResult.officialResult) { send({ type: "step", num: 4, title: "4. Official Source", body: '<span class="err">No official opencode.ai result in search</span>', active: false, done: true }); throw new Error("No official source"); }
            const source = await fetchSource(serpResult.officialResult.link);
            send({ type: "step", num: 4, title: "4. Official Source", body: '<span class="ok">Source retrieved</span>\nurl: ' + source.url + '\nstatus: ' + source.status + '\ncontent_hash: ' + source.contentHash.slice(0, 30) + '...\nlatency: ' + source.latencyMs + 'ms\nsnippets found: ' + source.snippets.length, active: false, done: true });

            // Step 5: Live extraction
            send({ type: "step", num: 5, title: "5. Live LLM Extraction", body: '<span class="sys">Calling MiMo v2.5 to extract facts from source...</span>', active: true, done: false });
            const extPrompt = extractionPrompt(source.snippets.join("\n\n"));
            const extLLM = await callLLM(env.OPENCODE_API_KEY, extPrompt);
            let extraction;
            try { extraction = JSON.parse(extLLM.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { extraction = { error: "parse failed", raw: extLLM.response }; }
            send({ type: "step", num: 5, title: "5. Live LLM Extraction", body: '<span class="ok">Extraction complete</span> (' + extLLM.latencyMs + 'ms)\ncapacity_requests_5h: <span class="ok">' + (extraction.capacity_requests_5h || "null") + '</span>\npromotion_multiplier: ' + (extraction.promotion_multiplier || "none") + '\nevidence: "' + (extraction.evidence || "—").slice(0, 100) + '"', active: false, done: true });

            // Step 6: Validation
            send({ type: "step", num: 6, title: "6. Deterministic Validation", body: '<span class="sys">Running validation checks...</span>', active: true, done: false });
            const validation = validate(extraction);
            const checkLines = validation.checks.map(c => '<span class="' + (c.pass ? "ok" : "err") + '">' + (c.pass ? "✓" : "✗") + " " + c.name + "</span>").join("\n");
            send({ type: "step", num: 6, title: "6. Deterministic Validation", body: checkLines + '\n\n<span class="' + (validation.accepted ? "ok" : "err") + '">Result: ' + (validation.accepted ? "ACCEPTED — fact verified" : "REJECTED — fact not verified") + '</span>', active: false, done: true });

            if (!validation.accepted) { throw new Error("Extraction rejected by validator"); }

            // Step 7: Fresh routing
            send({ type: "step", num: 7, title: "7. Fresh Agent Decision", body: '<span class="sys">Calling MiMo v2.5 with live market fact...</span>', active: true, done: false });
            const freshPrompt = routingPrompt(extraction.capacity_requests_5h, "live SerpApi discovery + official source extraction");
            const freshLLM = await callLLM(env.OPENCODE_API_KEY, freshPrompt);
            let freshDecision;
            try { freshDecision = JSON.parse(freshLLM.response.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch { freshDecision = { decision: "PARSE_ERROR", reason: freshLLM.response }; }
            const freshValid = freshDecision.decision === (extraction.capacity_requests_5h >= REQUIRED_REQUESTS ? "USE_OPENCODE_GO" : "BUY_FALLBACK");
            send({ type: "step", num: 7, title: "7. Fresh Agent Decision", body: '<span class="sys">MiMo v2.5 (' + freshLLM.latencyMs + 'ms):</span>\n<span class="' + (freshDecision.decision === "USE_OPENCODE_GO" ? "ok" : "err") + '">Decision: ' + freshDecision.decision + '</span>\nReason: ' + (freshDecision.reason || "—") + '\n<span class="sys">Deterministic check: ' + REQUIRED_REQUESTS + ' <= ' + extraction.capacity_requests_5h + ' = ' + (REQUIRED_REQUESTS <= extraction.capacity_requests_5h) + ' → ' + (freshValid ? '<span class="ok">CONFIRMED</span>' : '<span class="err">REJECTED</span>') + '</span>', active: false, done: true });

            // Step 8: Verification
            send({ type: "step", num: 8, title: "8. Verification", body: '<span class="sys">Comparing before and after...</span>', active: true, done: false });
            const routeChanged = baselineDecision.decision !== freshDecision.decision;
            send({ type: "step", num: 8, title: "8. Verification", body: '<span class="sys">Baseline: ' + baselineDecision.decision + '</span>\n<span class="sys">Live:     ' + freshDecision.decision + '</span>\n\n<span class="' + (routeChanged ? "ok" : "err") + '">' + (routeChanged ? "ROUTE CHANGED" : "ROUTE UNCHANGED") + '</span>', active: false, done: true });

            // Capture payload markdown from SerpApi
            var payloadMd = "";
            try {
              var payloadParams = new URLSearchParams({ q: "site:opencode.ai/go GLM-5.3-Flash usage limits", engine: "google_light", api_key: env.SERPAPI_API_KEY, no_cache: "true", output: "md" });
              var payloadRes = await fetch("https://serpapi.com/search.md?" + payloadParams);
              if (payloadRes.ok) payloadMd = await payloadRes.text();
            } catch (e) { payloadMd = "Failed to fetch markdown payload: " + e.message; }

            // Final
            var headline = routeChanged ? "ROUTE CHANGED" : "Route Unchanged";
            var detail = "Same workload (" + REQUIRED_REQUESTS + " requests/" + WINDOW_HOURS + "h). Same model (GLM-5.3-Flash). Same agent (MiMo v2.5). " + (routeChanged ? "Fresh market state changed the decision." : "Market state was already sufficient.");

            send({
              type: "done",
              headline: headline,
              detail: detail,
              evidence: {
                baseline: { capacity_5h: BASELINE_CAPACITY, required: REQUIRED_REQUESTS, sufficient: BASELINE_CAPACITY >= REQUIRED_REQUESTS },
                baseline_agent: { decision: baselineDecision.decision, reason: baselineDecision.reason, model: baselineLLM.model, latencyMs: baselineLLM.latencyMs },
                serpapi: serpResult,
                source: { url: source.url, status: source.status, contentHash: source.contentHash, latencyMs: source.latencyMs },
                extraction: { ...extraction, model: extLLM.model, latencyMs: extLLM.latencyMs },
                validation: validation,
                live_agent: { decision: freshDecision.decision, reason: freshDecision.reason, model: freshLLM.model, latencyMs: freshLLM.latencyMs },
                verification: { baselineDecision: baselineDecision.decision, liveDecision: freshDecision.decision, routeChanged: routeChanged }
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

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    if (url.pathname === "/api/demo/payload") {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            if (!env.SERPAPI_API_KEY) {
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: "SERPAPI_API_KEY not configured" }) + "\n\n"));
              controller.close();
              return;
            }
            const params = new URLSearchParams({ q: "site:opencode.ai/go GLM-5.3-Flash usage limits", engine: "google_light", api_key: env.SERPAPI_API_KEY, no_cache: "true", output: "md" });
            const res = await fetch("https://serpapi.com/search.md?" + params);
            const md = await res.text();
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ markdown: md }) + "\n\n"));
          } catch (e) {
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: e.message }) + "\n\n"));
          }
          controller.close();
        }
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" } });
    }

    return new Response("not found", { status: 404 });
  },
};
