const http = require('http');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.resolve(__dirname, 'data/livellm.db');
const PORT = 3847;
let db = null;

// ─── Database ──────────────────────────────────────────────────────
async function loadDb() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(DB_PATH);
  db = new SQL.Database(buf);
  console.log(`[db] Loaded ${DB_PATH}`);
}

function query(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

// ─── API Routes ────────────────────────────────────────────────────
function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data, null, 2));
}

function notFound(res) { json(res, { error: 'not found' }, 404); }

async function handleApi(req, res, url) {
  const p = url.pathname;

  // GET /api/v1/market
  if (p === '/api/v1/market' && req.method === 'GET') {
    const models = query('SELECT DISTINCT entity_id FROM facts WHERE valid_to IS NULL ORDER BY entity_id');
    const result = [];
    for (const { entity_id } of models) {
      const [provider, ...nameParts] = entity_id.split(':');
      const model = nameParts.join(':') || provider;
      const facts = query('SELECT field, value_json, confidence, evidence_id, valid_from FROM facts WHERE entity_id = ? AND valid_to IS NULL', [entity_id]);
      const factMap = {};
      facts.forEach(f => { factMap[f.field] = JSON.parse(f.value_json); });

      const route = { provider, input: factMap.input_price_usd_per_million, output: factMap.output_price_usd_per_million, cached_input: factMap.cached_input_price_usd_per_million };
      if (factMap.subscription_price_usd_month != null) route.monthly = factMap.subscription_price_usd_month;
      if (factMap.usage_value_usd_month != null) route.usage_value_usd_month = factMap.usage_value_usd_month;
      if (factMap.context_tokens) route.context_tokens = factMap.context_tokens;
      if (factMap.request_limit_month) route.request_limit_month = factMap.request_limit_month;
      if (factMap.promotion_type) {
        route.promotion = {
          type: factMap.promotion_type,
          ...(factMap.promotion_type === 'usage_multiplier' ? { multiplier: factMap.promotion_multiplier } : { discount_pct: factMap.promotion_discount_pct }),
          expires_at: factMap.promotion_end_at || null,
        };
      }
      if (factMap.quality_tier) route.quality_tier = factMap.quality_tier;
      if (factMap.speed_tier) route.speed_tier = factMap.speed_tier;
      const oldest = facts.sort((a, b) => (a.valid_from || '').localeCompare(b.valid_from || ''))[0];
      route.freshness = { as_of: oldest?.valid_from, confidence: Math.min(...facts.map(f => f.confidence || 1)), evidence_id: facts[0]?.evidence_id };

      const existing = result.find(m => m.model === model);
      if (existing) existing.routes.push(route);
      else result.push({ model, routes: [route] });
    }

    const totalFacts = queryOne('SELECT COUNT(*) as c FROM facts WHERE valid_to IS NULL');
    const promos = query("SELECT * FROM offers WHERE status = 'active'");

    return json(res, {
      generated_at: new Date().toISOString(),
      source: 'fact_ledger_live',
      models: result,
      stats: {
        total_models: result.length,
        total_routes: result.reduce((s, m) => s + m.routes.length, 0),
        total_facts: totalFacts?.c || 0,
        active_promotions: promos.length,
      },
    });
  }

  // GET /api/v1/changes
  if (p === '/api/v1/changes' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const rows = query('SELECT * FROM change_events ORDER BY detected_at DESC LIMIT ?', [limit]);
    const changes = rows.map(r => {
      let before = null, after = null;
      try { before = JSON.parse(r.before_json); } catch {}
      try { after = JSON.parse(r.after_json); } catch {}
      let change_pct = null;
      if (typeof before === 'number' && typeof after === 'number' && before !== 0) {
        change_pct = Math.round(((after - before) / Math.abs(before)) * 1000) / 10;
      }
      return { entity: r.entity_id, field: r.field, before, after, change_pct, type: r.event_type, detected_at: r.detected_at, occurred_at: r.occurred_at, evidence_id: r.evidence_id };
    });
    return json(res, { as_of: new Date().toISOString(), changes });
  }

  // GET /api/v1/evidence/:id
  if (p.startsWith('/api/v1/evidence/') && req.method === 'GET') {
    const evidenceId = decodeURIComponent(p.split('/api/v1/evidence/')[1]);
    const ev = queryOne('SELECT * FROM evidence WHERE evidence_id = ?', [evidenceId]);
    if (!ev) return json(res, { error: 'Evidence not found' }, 404);

    const obs = queryOne('SELECT * FROM source_observations WHERE observation_id = ?', [ev.observation_id]);
    let source = null;
    if (obs) {
      source = queryOne('SELECT * FROM sources WHERE source_id = ?', [obs.source_id]);
    }
    const fact = queryOne('SELECT * FROM facts WHERE evidence_id = ? LIMIT 1', [evidenceId]);

    return json(res, {
      evidence_id: ev.evidence_id,
      field: ev.field,
      quote: ev.quote_text,
      selector: ev.selector_or_path,
      hash: ev.evidence_hash,
      observation: obs ? { observed_at: obs.observed_at, http_status: obs.http_status, changed: obs.changed === 1 } : null,
      source: source ? { url: source.url, canonical_url: source.canonical_url, kind: source.kind, authority: source.authority } : null,
      fact: fact ? { entity: fact.entity_id, field: fact.field, value: JSON.parse(fact.value_json), confidence: fact.confidence, verification_state: fact.verification_state, valid_from: fact.valid_from } : null,
    });
  }

  // GET /api/v1/facts
  if (p === '/api/v1/facts' && req.method === 'GET') {
    const entityId = url.searchParams.get('entity');
    let sql = 'SELECT * FROM facts WHERE valid_to IS NULL';
    const params = [];
    if (entityId) { sql += ' AND entity_id = ?'; params.push(entityId); }
    sql += ' ORDER BY entity_id, field';
    const rows = query(sql, params);
    const facts = rows.map(r => ({ entity: r.entity_id, field: r.field, value: JSON.parse(r.value_json), confidence: r.confidence, verification_state: r.verification_state, valid_from: r.valid_from, evidence_id: r.evidence_id }));
    return json(res, { count: facts.length, facts });
  }

  // GET /api/v1/search-runs
  if (p === '/api/v1/search-runs' && req.method === 'GET') {
    const rows = query('SELECT * FROM search_runs ORDER BY executed_at DESC LIMIT 20');
    return json(res, { runs: rows });
  }

  // GET /api/v1/search-queries
  if (p === '/api/v1/search-queries' && req.method === 'GET') {
    const rows = query('SELECT * FROM discovery_queries ORDER BY query_id');
    return json(res, { queries: rows });
  }

  // GET /api/v1/stats
  if (p === '/api/v1/stats' && req.method === 'GET') {
    const facts = queryOne('SELECT COUNT(*) as c FROM facts WHERE valid_to IS NULL');
    const entities = queryOne('SELECT COUNT(DISTINCT entity_id) as c FROM facts WHERE valid_to IS NULL');
    const evidence = queryOne('SELECT COUNT(*) as c FROM evidence');
    const observations = queryOne('SELECT COUNT(*) as c FROM source_observations');
    const sources = queryOne('SELECT COUNT(*) as c FROM sources');
    const changes = queryOne('SELECT COUNT(*) as c FROM change_events');
    const searchRuns = queryOne('SELECT COUNT(*) as c FROM search_runs');
    const searchResults = queryOne('SELECT COUNT(*) as c FROM search_results');
    const promos = query("SELECT COUNT(*) as c FROM offers WHERE status = 'active'");
    const tables = query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");

    return json(res, {
      facts: facts?.c || 0,
      entities: entities?.c || 0,
      evidence: evidence?.c || 0,
      observations: observations?.c || 0,
      sources: sources?.c || 0,
      changes: changes?.c || 0,
      searchRuns: searchRuns?.c || 0,
      searchResults: searchResults?.c || 0,
      promotions: promos?.c || 0,
      tables: tables.map(t => t.name),
    });
  }

  // POST /api/v1/serpapi/search
  if (p === '/api/v1/serpapi/search' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { query: q, engine = 'google_light' } = JSON.parse(body || '{}');
    if (!q) return json(res, { error: 'query required' }, 400);

    const apiKey = process.env.SERPAPI_API_KEY || '';
    if (!apiKey) return json(res, { error: 'SERPAPI_API_KEY not set' }, 500);

    const t = Date.now();
    try {
      const params = new URLSearchParams({ q, engine, api_key: apiKey });
      const r = await fetch(`https://serpapi.com/search.json?${params}`);
      const data = await r.json();
      if (data.error) return json(res, { error: data.error });

      // Log to search_runs
      const searchId = data.search_metadata?.id || '';
      const results = data.organic_results || data.news_results || [];
      db.run('INSERT INTO search_runs (search_run_id, query_id, request_hash, serpapi_search_id, executed_at, from_local_cache, result_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [searchId, 'live-' + Date.now(), '', searchId, new Date().toISOString(), 0, results.length]);

      return json(res, {
        searchId,
        status: data.search_metadata?.status,
        engine,
        query: q,
        latencyMs: Date.now() - t,
        resultCount: results.length,
        results: results.slice(0, 10).map(r => ({ title: r.title, link: r.link, snippet: (r.snippet || '').slice(0, 150), position: r.position })),
      });
    } catch (e) {
      return json(res, { error: e.message }, 500);
    }
  }

  // POST /api/v1/serpapi/account
  if (p === '/api/v1/serpapi/account' && req.method === 'POST') {
    const apiKey = process.env.SERPAPI_API_KEY || '';
    if (!apiKey) return json(res, { error: 'SERPAPI_API_KEY not set' }, 500);
    try {
      const r = await fetch(`https://serpapi.com/account.json?api_key=${apiKey}`);
      const d = await r.json();
      return json(res, { plan_name: d.plan_name, searches_per_month: d.searches_per_month, this_month_usage: d.this_month_usage, total_searches_left: d.total_searches_left, plan_renewal_date: d.plan_renewal_date });
    } catch (e) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/v1/health
  if (p === '/api/v1/health') return json(res, { status: 'ok', db: !!db, facts: queryOne('SELECT COUNT(*) as c FROM facts WHERE valid_to IS NULL')?.c || 0 });

  notFound(res);
}

// ─── Server ────────────────────────────────────────────────────────
async function main() {
  await loadDb();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      return res.end();
    }

    // API routes
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);

    // Dashboard
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(DASHBOARD);
    }

    notFound(res);
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] LiveLLM Dashboard running on http://localhost:${PORT}`);
    console.log(`[server] API: http://localhost:${PORT}/api/v1/market`);
    console.log(`[server] Dashboard: http://localhost:${PORT}/`);
  });
}

main().catch(console.error);

// ─── Dashboard HTML ────────────────────────────────────────────────
const DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LiveLLM — Verified Economic Intelligence</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
code,.mono{font-family:'JetBrains Mono',monospace}
nav{background:#1e293b;border-bottom:1px solid #334155;padding:0 1.5rem;position:sticky;top:0;z-index:100}
.ni{max-width:1400px;margin:0 auto;display:flex;align-items:center;height:48px;gap:1.5rem}
.ni .logo{font-weight:700;font-size:1rem;color:#f8fafc}.ni .logo span{color:#059669}
.ni a{font-size:.78rem;color:#94a3b8;text-decoration:none;font-weight:500}.ni a:hover{color:#f8fafc}
.ni .live{font-size:.55rem;padding:2px 6px;border:1px solid #059669;color:#059669;border-radius:4px;margin-left:4px}
.wrap{max-width:1400px;margin:0 auto;padding:1.5rem}
h2{font-size:1.1rem;font-weight:700;color:#f8fafc;margin-bottom:.5rem}
h3{font-size:.85rem;font-weight:600;color:#f8fafc;margin-bottom:.5rem}
.sub{font-size:.78rem;color:#64748b}
/* Grid layouts */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:1rem}
@media(max-width:900px){.g2,.g3,.g4,.g5{grid-template-columns:1fr}}
/* Cards */
.card{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:1rem}
.card h4{font-size:.6rem;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;margin-bottom:.5rem}
.stat{text-align:center;padding:1rem}.stat .n{font-size:1.8rem;font-weight:700;color:#f8fafc;letter-spacing:-.02em}.stat .l{font-size:.68rem;color:#64748b;margin-top:2px}
/* Tables */
table{width:100%;border-collapse:collapse;font-size:.72rem}
th{text-align:left;font-size:.55rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b;padding:6px 8px;border-bottom:1px solid #334155;font-weight:600}
td{padding:6px 8px;border-bottom:1px solid #1e293b}
tr:hover{background:#1e293b}
/* Tags */
.tag{display:inline-block;padding:2px 6px;border-radius:4px;font-size:.55rem;font-weight:600}
.t-g{background:#064e3b;color:#34d399}.t-r{background:#7f1d1d;color:#fca5a5}.t-y{background:#78350f;color:#fcd34d}.t-b{background:#1e3a5f;color:#93c5fd}.t-p{background:#3b0764;color:#c084fc}
/* Buttons */
.btn{padding:6px 14px;border-radius:6px;font-size:.75rem;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all .15s}
.btn-g{background:#059669;color:#fff}.btn-g:hover{background:#047857}
.btn-d{background:#334155;color:#e2e8f0}.btn-d:hover{background:#475569}
.btn:disabled{opacity:.4;cursor:not-allowed}
/* Tabs */
.tabs{display:flex;gap:0;border-bottom:1px solid #334155;margin-bottom:1rem}
.tab{padding:.5rem 1rem;font-size:.75rem;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}
.tab:hover{color:#e2e8f0}.tab.on{color:#f8fafc;border-bottom-color:#059669}
.panel{display:none}.panel.on{display:block}
/* Log */
.log{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:.75rem;font-family:'JetBrains Mono',monospace;font-size:.65rem;line-height:1.7;max-height:400px;overflow-y:auto}
.log div{padding:1px 0;border-bottom:1px solid #0f172a}
.log .ts{color:#475569}.log .ok{color:#34d399}.log .err{color:#f87171}.log .api{color:#a78bfa}.log .sys{color:#60a5fa}
/* Search info */
.sinfo{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:.75rem;margin-top:.75rem}
.sinfo dt{font-size:.5rem;text-transform:uppercase;letter-spacing:.5px;color:#475569}.sinfo dd{font-size:.75rem;font-weight:500;color:#e2e8f0;margin-top:2px}
/* Split */
.split{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
@media(max-width:900px){.split{grid-template-columns:1fr}}
.result-box{background:#0f172a;border:1px solid #1e293b;border-radius:6px;padding:.75rem;margin-top:.75rem}
.result-box .rl{font-size:.5rem;text-transform:uppercase;letter-spacing:1px;color:#475569;margin-bottom:4px}
.result-box .rv{font-size:1.1rem;font-weight:700;font-family:'JetBrains Mono',monospace}
.result-box .rm{font-size:.62rem;color:#475569;margin-top:2px}
/* Section */
.sec{margin-top:1.5rem}
.sec-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem}
</style>
</head>
<body>
<nav><div class="ni">
  <div class="logo">Live<span>LLM</span><span class="live">LIVE</span></div>
  <a href="#overview">Overview</a>
  <a href="#ledger">Fact Ledger</a>
  <a href="#demo">Live Demo</a>
  <a href="#changes">Changes</a>
  <a href="#provenance">Provenance</a>
  <a href="#raw">Raw DB</a>
</div></nav>

<div class="wrap">

<!-- ═══ OVERVIEW ═══════════════════════════════════════════════════ -->
<div id="overview">
  <h2>LiveLLM Dashboard</h2>
  <div class="sub">Verified economic intelligence for autonomous agents. This dashboard talks to the live fact ledger.</div>
  <div class="g5" id="stats-row" style="margin-top:1rem"></div>
</div>

<!-- ═══ FACT LEDGER ════════════════════════════════════════════════ -->
<div class="sec" id="ledger">
  <div class="sec-h">
    <div><h2>Fact Ledger</h2><div class="sub">All active facts in the verified fact ledger. Every number has provenance.</div></div>
    <button class="btn btn-g" onclick="loadFacts()">Refresh</button>
  </div>
  <div class="card" style="overflow-x:auto">
    <table>
      <thead><tr><th>Entity</th><th>Field</th><th>Value</th><th>Confidence</th><th>Verification</th><th>Valid From</th><th>Evidence</th></tr></thead>
      <tbody id="facts-tbody"></tbody>
    </table>
  </div>
</div>

<!-- ═══ MARKET ═════════════════════════════════════════════════════ -->
<div class="sec">
  <div class="sec-h">
    <div><h2>Market Payload</h2><div class="sub">Canonical market snapshot from the fact ledger. Same data agents consume via /v1/market.</div></div>
    <button class="btn btn-g" onclick="loadMarket()">Load /api/v1/market</button>
  </div>
  <div class="card" style="overflow-x:auto">
    <table>
      <thead><tr><th>Model</th><th>Provider</th><th>Input/1M</th><th>Output/1M</th><th>Cached/1M</th><th>Monthly</th><th>Usage Value</th><th>Context</th><th>Req/mo</th><th>Promo</th><th>Evidence</th></tr></thead>
      <tbody id="market-tbody"></tbody>
    </table>
  </div>
</div>

<!-- ═══ LIVE DEMO ══════════════════════════════════════════════════ -->
<div class="sec" id="demo">
  <h2>Live SerpApi Demo</h2>
  <div class="sub">Make a real SerpApi search. Watch the pipeline execute. See the search_metadata.id.</div>

  <div class="g2" style="margin-top:1rem">
    <div class="card">
      <h4>Before / After</h4>
      <div class="split">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span style="font-size:.7rem;font-weight:600;color:#f8fafc">$15 Bounty</span><span class="tag t-r">STALE</span></div>
          <div class="log" id="left-log" style="min-height:150px"></div>
          <div class="result-box" id="left-res" style="display:none"><div class="rl">Monthly Cost</div><div class="rv" style="color:#f87171" id="left-cost"></div><div class="rm" id="left-route"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span style="font-size:.7rem;font-weight:600;color:#f8fafc">$15 Bounty</span><span class="tag t-g">VERIFIED</span></div>
          <div class="log" id="right-log" style="min-height:150px"></div>
          <div class="result-box" id="right-res" style="display:none"><div class="rl">Monthly Cost</div><div class="rv" style="color:#34d399" id="right-cost"></div><div class="rm" id="right-route"></div></div>
        </div>
      </div>
      <div style="text-align:center;margin-top:.75rem">
        <button class="btn btn-g" onclick="runDemo()">Run Demo</button>
      </div>
    </div>
    <div class="card">
      <h4>SerpApi Search</h4>
      <div style="display:flex;gap:.5rem;margin-bottom:.75rem">
        <input id="search-q" value="LLM API pricing 2026 OpenCode Go promotion" style="flex:1;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:6px;font-family:inherit;font-size:.75rem">
        <button class="btn btn-g" onclick="doSearch()">Search</button>
      </div>
      <div id="search-results" class="log" style="min-height:180px"></div>
      <div id="search-info"></div>
    </div>
  </div>
</div>

<!-- ═══ CHANGES ════════════════════════════════════════════════════ -->
<div class="sec" id="changes">
  <div class="sec-h">
    <div><h2>Change Events</h2><div class="sub">Temporal fact supersession. Old facts closed, new facts opened.</div></div>
    <button class="btn btn-g" onclick="loadChanges()">Load</button>
  </div>
  <div class="card" style="overflow-x:auto">
    <table>
      <thead><tr><th>Entity</th><th>Field</th><th>Before</th><th>After</th><th>Change</th><th>Detected</th><th>Evidence</th></tr></thead>
      <tbody id="changes-tbody"></tbody>
    </table>
  </div>
</div>

<!-- ═══ PROVENANCE ══════════════════════════════════════════════════ -->
<div class="sec" id="provenance">
  <div class="sec-h">
    <div><h2>Provenance Explorer</h2><div class="sub">Click any evidence ID to see the full chain: evidence &rarr; observation &rarr; source &rarr; search.</div></div>
  </div>
  <div style="display:flex;gap:.5rem;margin-bottom:.75rem">
    <input id="ev-id" placeholder="Evidence ID" style="flex:1;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:6px;font-family:inherit;font-size:.75rem">
    <button class="btn btn-g" onclick="loadEvidence()">Look Up</button>
  </div>
  <div id="evidence-result" class="card" style="display:none"></div>
</div>

<!-- ═══ RAW DB ═════════════════════════════════════════════════════ -->
<div class="sec" id="raw">
  <div class="sec-h">
    <div><h2>Raw Database</h2><div class="sub">Direct queries against the SQLite fact ledger.</div></div>
  </div>
  <div class="card">
    <h4>Search Runs (SerpApi Calls)</h4>
    <div style="overflow-x:auto">
      <table>
        <thead><tr><th>Run ID</th><th>Search ID</th><th>Executed</th><th>Results</th><th>New URLs</th><th>Candidates</th></tr></thead>
        <tbody id="runs-tbody"></tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <h4>Discovery Queries</h4>
    <div style="overflow-x:auto">
      <table>
        <thead><tr><th>ID</th><th>Engine</th><th>Query</th><th>Purpose</th><th>Paid Runs</th><th>Useful Hits</th><th>Last Run</th></tr></thead>
        <tbody id="queries-tbody"></tbody>
      </table>
    </div>
  </div>
</div>

</div><!-- wrap -->

<script>
// ─── API Helper ────────────────────────────────────────────────
async function api(path, opts) {
  const r = await fetch(path, opts);
  return r.json();
}

// ─── Logging ───────────────────────────────────────────────────
function L(id, msg, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  const t = new Date().toISOString().slice(11, 19);
  el.innerHTML += '<div><span class="ts">[' + t + ']</span> <span class="' + (cls || 'sys') + '">' + msg + '</span></div>';
  el.scrollTop = el.scrollHeight;
}

// ─── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  const d = await api('/api/v1/stats');
  const items = [
    { n: d.facts, l: 'Active Facts' },
    { n: d.entities, l: 'Entities' },
    { n: d.evidence, l: 'Evidence Records' },
    { n: d.observations, l: 'Source Observations' },
    { n: d.changes, l: 'Change Events' },
    { n: d.searchRuns, l: 'Search Runs' },
    { n: d.searchResults, l: 'Search Results' },
    { n: d.promotions, l: 'Active Promos' },
    { n: d.tables?.length || 0, l: 'DB Tables' },
  ];
  document.getElementById('stats-row').innerHTML = items.map(i =>
    '<div class="card stat"><div class="n">' + i.n + '</div><div class="l">' + i.l + '</div></div>'
  ).join('');
}

// ─── Fact Ledger ───────────────────────────────────────────────
async function loadFacts() {
  const d = await api('/api/v1/facts');
  const rows = d.facts.map(f => {
    const val = typeof f.value === 'number' ? '$' + f.value + (f.field.includes('price') ? '/M' : '') : String(f.value);
    return '<tr>' +
      '<td><strong>' + f.entity + '</strong></td>' +
      '<td>' + f.field + '</td>' +
      '<td class="mono">' + val + '</td>' +
      '<td>' + (f.confidence || '—') + '</td>' +
      '<td><span class="tag ' + (f.verification_state === 'verified' ? 't-g' : 't-y') + '">' + (f.verification_state || '—') + '</span></td>' +
      '<td style="font-size:.65rem;color:#64748b">' + (f.valid_from || '—') + '</td>' +
      '<td><button class="btn btn-d" style="font-size:.6rem;padding:2px 6px">View</button></td>' +
      '</tr>';
  }).join('');
  document.getElementById('facts-tbody').innerHTML = rows || '<tr><td colspan="7" style="color:#64748b">No facts found</td></tr>';
}

// ─── Market ────────────────────────────────────────────────────
async function loadMarket() {
  const d = await api('/api/v1/market');
  const rows = d.models.map(m => m.routes.map(r => {
    const promo = r.promotion ? (r.promotion.type === 'usage_multiplier' ? r.promotion.multiplier + 'x' : r.promotion.discount_pct + '%') : '—';
    const pc = r.promotion ? 't-y' : '';
    return '<tr>' +
      '<td><strong>' + m.model + '</strong></td>' +
      '<td style="color:#64748b">' + r.provider + '</td>' +
      '<td>$' + r.input + '</td><td>$' + r.output + '</td><td>$' + r.cached_input + '</td>' +
      '<td>' + (r.monthly ? '$' + r.monthly + '/mo' : '—') + '</td>' +
      '<td>' + (r.usage_value_usd_month ? '$' + r.usage_value_usd_month + '/mo' : '—') + '</td>' +
      '<td>' + (r.context_tokens ? r.context_tokens.toLocaleString() : '—') + '</td>' +
      '<td>' + (r.request_limit_month ? r.request_limit_month.toLocaleString() : '—') + '</td>' +
      '<td><span class="tag ' + pc + '">' + promo + '</span></td>' +
      '<td><button class="btn btn-d" style="font-size:.6rem;padding:2px 6px" >View</button></td>' +
      '</tr>';
  }).join('')).join('');
  document.getElementById('market-tbody').innerHTML = rows || '<tr><td colspan="11">No data</td></tr>';
}

// ─── Changes ───────────────────────────────────────────────────
async function loadChanges() {
  const d = await api('/api/v1/changes');
  const rows = d.changes.map(c => {
    const changeStr = c.change_pct != null ? (c.change_pct > 0 ? '+' : '') + c.change_pct + '%' : '—';
    const cls = c.change_pct > 0 ? 't-r' : c.change_pct < 0 ? 't-g' : '';
    return '<tr>' +
      '<td><strong>' + c.entity + '</strong></td>' +
      '<td>' + c.field + '</td>' +
      '<td class="mono">' + JSON.stringify(c.before) + '</td>' +
      '<td class="mono">' + JSON.stringify(c.after) + '</td>' +
      '<td><span class="tag ' + cls + '">' + changeStr + '</span></td>' +
      '<td style="font-size:.65rem;color:#64748b">' + (c.detected_at || '—') + '</td>' +
      '<td><button class="btn btn-d" style="font-size:.6rem;padding:2px 6px" >View</button></td>' +
      '</tr>';
  }).join('');
  document.getElementById('changes-tbody').innerHTML = rows || '<tr><td colspan="7" style="color:#64748b">No changes recorded</td></tr>';
}

// ─── Evidence ──────────────────────────────────────────────────
async function loadEvidence() {
  const id = document.getElementById('ev-id').value.trim();
  if (!id) return;
  const d = await api('/api/v1/evidence/' + encodeURIComponent(id));
  const el = document.getElementById('evidence-result');
  el.style.display = 'block';
  if (d.error) { el.innerHTML = '<div style="color:#f87171">' + d.error + '</div>'; return; }
  el.innerHTML = '<h4>Evidence: ' + d.evidence_id + '</h4>' +
    '<div class="g2" style="margin-top:.75rem">' +
    '<div><div style="font-size:.55rem;color:#475569;text-transform:uppercase;letter-spacing:.5px">Field</div><div style="font-weight:600">' + (d.field || '—') + '</div></div>' +
    '<div><div style="font-size:.55rem;color:#475569;text-transform:uppercase;letter-spacing:.5px">Hash</div><div class="mono" style="font-size:.7rem;word-break:break-all">' + (d.hash || '—') + '</div></div>' +
    '</div>' +
    (d.quote ? '<div style="margin-top:.75rem"><div style="font-size:.55rem;color:#475569;text-transform:uppercase;letter-spacing:.5px">Evidence Quote</div><div style="background:#0f172a;border:1px solid #1e293b;border-radius:4px;padding:.5rem;font-size:.72rem;margin-top:4px;font-style:italic">' + d.quote + '</div></div>' : '') +
    (d.source ? '<div style="margin-top:.75rem"><div style="font-size:.55rem;color:#475569;text-transform:uppercase;letter-spacing:.5px">Source</div><div style="margin-top:4px"><strong>' + (d.source.kind || '—') + '</strong> <span style="color:#64748b">' + (d.source.authority || '') + '</span><br><a href="' + d.source.url + '" target="_blank" style="color:#60a5fa;font-size:.72rem">' + d.source.url + '</a></div></div>' : '') +
    (d.observation ? '<div style="margin-top:.75rem"><div style="font-size:.55rem;color:#475569;text-transform:uppercase;letter-spacing:.5px">Observation</div><div style="margin-top:4px">Observed: ' + d.observation.observed_at + ' | HTTP ' + d.observation.http_status + ' | Changed: ' + (d.observation.changed ? 'YES' : 'no') + '</div></div>' : '') +
    (d.fact ? '<div style="margin-top:.75rem"><div style="font-size:.55rem;color:#475569;text-transform:uppercase;letter-spacing:.5px">Linked Fact</div><div style="margin-top:4px"><strong>' + d.fact.entity + '</strong> ' + d.fact.field + ' = <span class="mono">' + JSON.stringify(d.fact.value) + '</span> (confidence: ' + d.fact.confidence + ', state: ' + d.fact.verification_state + ')</div></div>' : '');
}

// ─── Live Search ───────────────────────────────────────────────
async function doSearch() {
  const q = document.getElementById('search-q').value.trim();
  if (!q) return;
  const logEl = document.getElementById('search-results');
  logEl.innerHTML = '';
  L('search-results', 'POST /api/v1/serpapi/search', 'api');
  L('search-results', 'query: "' + q + '"', 'sys');
  try {
    const d = await api('/api/v1/serpapi/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
    if (d.error) { L('search-results', 'Error: ' + d.error, 'err'); return; }
    L('search-results', 'Search ID: ' + d.searchId, 'ok');
    L('search-results', 'Engine: ' + d.engine + ' | Latency: ' + d.latencyMs + 'ms | Results: ' + d.resultCount, 'ok');
    d.results.forEach(r => L('search-results', '  #' + r.position + ' ' + r.title, 'sys'));
    document.getElementById('search-info').innerHTML = '<div class="sinfo"><div><dt>Search ID</dt><dd style="color:#34d399;font-size:.65rem;word-break:break-all">' + d.searchId + '</dd></div><div><dt>Engine</dt><dd>' + d.engine + '</dd></div><div><dt>Latency</dt><dd>' + d.latencyMs + 'ms</dd></div><div><dt>Results</dt><dd>' + d.resultCount + '</dd></div></div>';
  } catch (e) { L('search-results', 'Error: ' + e.message, 'err'); }
}

// ─── Demo ──────────────────────────────────────────────────────
async function runDemo() {
  document.getElementById('left-log').innerHTML = '';
  document.getElementById('right-log').innerHTML = '';
  document.getElementById('left-res').style.display = 'none';
  document.getElementById('right-res').style.display = 'none';

  var wl = { u: 100000, c: 0, o: 5000 };
  var staleCost = (0.075 / 1e6) * wl.u + (0.25 / 1e6) * wl.o;

  L('left-log', 'Agent: $15 bounty, 100K in + 5K out', 'sys');
  L('left-log', 'No live data available', 'err');
  L('left-log', 'Using GLM-5.3-Flash: $0.075/M in, $0.25/M out', 'sys');
  L('left-log', 'Monthly: $' + staleCost.toFixed(6), 'err');
  document.getElementById('left-res').style.display = 'block';
  document.getElementById('left-cost').textContent = '$' + staleCost.toFixed(6) + '/mo';
  document.getElementById('left-route').textContent = 'Z.ai:GLM-5.3-Flash \\u2014 no verification';

  await new Promise(r => setTimeout(r, 400));

  L('right-log', 'Agent: $15 bounty, 100K in + 5K out', 'sys');
  L('right-log', 'GET /api/v1/market...', 'api');
  try {
    var d = await api('/api/v1/market');
    L('right-log', d.models.length + ' models loaded from fact ledger', 'ok');
    L('right-log', d.stats.total_facts + ' verified facts, ' + d.stats.active_promotions + ' active promotions', 'ok');
    var best = null, bc = Infinity;
    d.models.forEach(function(m) { m.routes.forEach(function(r) {
      if (r.context_tokens && r.context_tokens < (wl.u + wl.c + wl.o) * 1.2) return;
      if (r.input === 0 && r.output === 0) return;
      var cost = ((r.input / 1e6) * wl.u + (r.cached_input / 1e6) * wl.c + (r.output / 1e6) * wl.o) * 240 * 30;
      if (cost < bc) { bc = cost; best = { model: m.model, provider: r.provider, cost: cost, input: r.input, ctx: r.context_tokens }; }
    }); });
    if (best) {
      L('right-log', 'Selected: ' + best.provider + ':' + best.model + ' $' + best.input + '/M in', 'ok');
      L('right-log', 'Monthly: $' + best.cost.toFixed(6) + ' (saves $' + (staleCost - best.cost).toFixed(6) + ')', 'ok');
      document.getElementById('right-res').style.display = 'block';
      document.getElementById('right-cost').textContent = '$' + best.cost.toFixed(6) + '/mo';
      document.getElementById('right-route').textContent = best.provider + ':' + best.model + ' \\u2014 fact ledger verified';
    }
  } catch (e) { L('right-log', 'Error: ' + e.message, 'err'); }
}

// ─── Raw DB ────────────────────────────────────────────────────
async function loadRawDB() {
  const runs = await api('/api/v1/search-runs');
  document.getElementById('runs-tbody').innerHTML = (runs.runs || []).map(r =>
    '<tr><td class="mono" style="font-size:.6rem">' + (r.search_run_id || '').slice(0, 16) + '</td><td class="mono" style="font-size:.6rem">' + (r.serpapi_search_id || '').slice(0, 20) + '</td><td style="font-size:.65rem">' + (r.executed_at || '—') + '</td><td>' + (r.result_count || 0) + '</td><td>' + (r.new_url_count || 0) + '</td><td>' + (r.candidate_count || 0) + '</td></tr>'
  ).join('') || '<tr><td colspan="6" style="color:#64748b">No search runs recorded</td></tr>';

  const queries = await api('/api/v1/search-queries');
  document.getElementById('queries-tbody').innerHTML = (queries.queries || []).map(q =>
    '<tr><td class="mono" style="font-size:.6rem">' + (q.query_id || '').slice(0, 16) + '</td><td>' + (q.engine || '—') + '</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (q.query_text || '—') + '</td><td style="color:#64748b">' + (q.purpose || '—') + '</td><td>' + (q.paid_runs || 0) + '</td><td>' + (q.useful_hits || 0) + '</td><td style="font-size:.65rem">' + (q.last_run_at || '—') + '</td></tr>'
  ).join('') || '<tr><td colspan="7" style="color:#64748b">No queries registered</td></tr>';
}

// ─── Init ──────────────────────────────────────────────────────
loadStats();
loadFacts();
loadChanges();
loadRawDB();
</script>
</body>
</html>`;
