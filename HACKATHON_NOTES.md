# LiveLLM — Hackathon Demo Engineering Notes

Refined details for future hackathon submissions.

---

## What was built

A Cloudflare Worker that runs a full agent routing story with live SerpApi integration, streaming activity logs, and deterministic cost math.

**Live:** https://livellm.tradesprior.workers.dev
**Repo:** https://github.com/prx0r/livellm

---

## Key engineering decisions

### 1. SSE streaming (not batch JSON)

The demo streams activity logs in real-time via Server-Sent Events. Each API call, response, and cost calculation appears as it happens — not after a 30-second loading screen.

**Backend pattern:**
```js
const stream = new ReadableStream({
  async start(controller) {
    function send(obj) { controller.enqueue(encoder.encode("data: " + JSON.stringify(obj) + "\n\n")); }
    function log(cls, msg) { send({ type: "log", cls, msg }); }

    // Each step sends logs as it runs
    log("req", "POST https://opencode.ai/zen/go/v1/chat/completions");
    const result = await callLLM(apiKey, prompt);
    log("res", "200 OK (" + result.latencyMs + "ms)");
    log("ok", "ROUTE: " + route);

    send({ type: "done", ...finalData });
    controller.close();
  }
});
return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
```

**Client pattern:**
```js
var reader = r.body.getReader();
var dec = new TextDecoder();
var buf = '';
while (true) {
  var chunk = await reader.read();
  if (chunk.done) break;
  buf += dec.decode(chunk.value, { stream: true });  // ← chunk.value, not chunk!
  var lines = buf.split('\n');
  buf = lines.pop();
  for (var line of lines) {
    if (line.startsWith('data: ')) {
      var evt = JSON.parse(line.slice(6));
      if (evt.type === 'log') renderLog(evt);
      if (evt.type === 'done') renderResult(evt);
    }
  }
}
```

**Gotcha:** `decoder.decode(chunk.value)` not `decoder.decode(chunk)`. The `chunk` is `{value: Uint8Array, done: bool}`, not the raw bytes.

### 2. The demo is the story, not the pipeline

Two tabs:
- **Story** (default) — the 2.5-minute judge narrative: problem → stale → live → savings
- **Pipeline** — the 9-step infrastructure view for judges who dig deeper

The hero button triggers the story, not the pipeline. The pipeline is supplementary.

### 3. Cost math is pre-computed, not LLM-derived

The LLM makes routing decisions (which model to pick), but the cost math is computed deterministically in the backend:

```js
costPerRequest = (input * 830 + cached * 71500 + output * 295) / 1_000_000
effectiveMonthly = costPerRequest * requests / subscriptionPrice
```

The LLM doesn't do the math — code does. The LLM only picks the route.

### 4. Stale data is realistic, not strawman

The stale market data shows what an agent actually sees from OpenRouter/LiteLLM: PAYG prices only, no subscription info, no promotion multipliers. This is a realistic blind spot, not a rigged comparison.

### 5. Full provenance chain

Every fact traces to:
- `search_id` — SerpApi search identifier (reproducible via Search Archive)
- `canonical_hash` — SHA-256 of normalized search params (deterministic)
- `content_hash` — SHA-256 of source HTML
- `observed_at` — exact ISO timestamp

---

## Video storyboard (2.5 minutes)

| Time | Action | Screen shows |
|------|--------|-------------|
| 0:00 | Page loads | Hero: "The agent's math was correct. Its market state was wrong." |
| 0:05 | Click **Run Demo** | Story tab activates, logs start streaming |
| 0:10 | Logs stream | "23 models loaded from fact ledger" |
| 0:15 | Stale agent call | "→ POST opencode.ai/zen/go/v1/chat/completions" |
| 0:22 | Stale result | "ROUTE: Z.ai:GLM-5.3-Flash COST: $39.22/mo" |
| 0:25 | Live agent call | "→ POST opencode.ai/zen/go/v1/chat/completions" |
| 0:32 | Live result | "ROUTE: OpenCode:MiMo V2.5 COST: $6.00/mo" |
| 0:35 | Provenance | "search_id: 6a98f... content_hash: sha256:13847..." |
| 0:40 | Cost math | "Z.ai: $0.001209/req × 7200 = $8.70/mo" |
| 0:45 | Verdict | "MiMo V2.5 via OpenCode Go is cheapest — 31% cheaper" |
| 0:50 | Click **Payload** tab | "Generate Payload" button |
| 0:55 | Click Generate | Real SerpApi call, markdown streams in |
| 1:05 | Payload visible | 23 models with full pricing table |
| 1:10 | Click **Pipeline** tab | 9-step infrastructure view |
| 1:15 | Point at logs | "SerpApi search_id, SHA-256 content hash, 6-step validation" |
| 1:30 | Click **Agents** tab | "Run Agent Comparison" |
| 1:35 | Agents stream | 3 agents × 2 conditions = 6 LLM calls streaming |
| 2:00 | Results appear | Side-by-side stale vs live decisions |
| 2:15 | Close | "Agents already pay for models. LiveLLM makes the economics they reason over live." |

**What to say:**
- "This agent's math was correct. Its market state was wrong."
- "Same model, same workload, same agent. Only the market data changed."
- "SerpApi discovers the change. LiveLLM verifies it. The agent reroutes."
- "23 models, 9 providers, verified from official pricing pages."
- "Content-addressed provenance — every fact traces to a search ID."

---

## Tab behavior

| Tab | What it shows | When |
|-----|--------------|------|
| Story | Streaming logs + verdict | Auto on "Run Demo" |
| Pipeline | 9-step infrastructure logs | Auto on "Run Demo" |
| Agents | 3 agents × 2 conditions | Click "Run Agent Comparison" |
| Evidence | search_id, content_hash, routes, costs | Auto-populates from story |
| Payload | 23-model markdown table | Click "Generate Payload" |

---

## What went wrong (and how we fixed it)

1. **SSE streaming broken** — `decoder.decode(chunk)` should be `decoder.decode(chunk.value)`. Cloudflare Workers SSE works fine, the client had a bug.

2. **Batch JSON felt dead** — Loading screen for 30 seconds. Fixed by switching to SSE.

3. **"Click Run Demo" prompt was patronizing** — Removed. The hero button is self-explanatory for a technical audience.

4. **LLM regex parsing** — LLMs return `ROUTE: X | COST: Y | REASON: Z` on one line. Need `match(/ROUTE:\s*(.+?)(?:\s*\|)/)` not `match(/ROUTE:\s*(.+)/)`.

5. **Duplicate function bodies** — Old code left after edits caused syntax errors. Always verify with `node --check` before deploying.

6. **GitHub secret scanning** — API tokens in HANDOVER.md blocked push. Redact before committing.

---

## Reusable patterns for future hackathons

### The "problem → stale → live → savings" narrative
Works for any system that improves decisions with fresh data. Replace "model routing" with your domain.

### SSE streaming for demos
Makes any API call feel alive. Show the work happening, not a spinner.

### Pre-computed math + LLM decisions
Let code do the deterministic work (cost calculation, validation). Let LLM do the judgment work (routing, reasoning). Don't mix them.

### Content-addressed provenance
SHA-256 everything. Search IDs, source hashes, request hashes. Judges love auditability.

### Tab architecture
Story (narrative) | Pipeline (infrastructure) | Payload (product surface). Three levels of depth for three levels of judge interest.
