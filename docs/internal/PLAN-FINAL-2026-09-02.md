# LiveLLM — Fresh Audit + Final SerpApi Win-Probability Plan

## Current verdict

I re-audited the current repo rather than relying on our older discussion.

Latest commit: `a0cf8762a15e8e9fc1c637a34d7d8fa6d20dc370`.

**CI is green.** The latest GitHub Actions run proves:

```text
11 test suites passed
76 tests passed
npm run build passed
0 npm vulnerabilities at install time
```

So LiveLLM is not actually far behind technically. It is behind **ProofDesk and DomainArena in judge-facing packaging**.

It already has:

- SerpApi radar pipeline
- Google News Light
- Google Light
- Search Index / deep exploration
- JSON Restrictor
- Account API quota governance
- Search IDs/provenance
- official-source follow-up
- AI extraction
- deterministic fact validation
- temporal fact ledger
- economic derivation
- promotions/subscriptions/free tiers/cached input economics
- HTTP API
- MCP
- GLM promotion replay demo
- three-agent market-consumption demo
- generated dashboard
- 76 green tests

The missing thing is a **single deployed judge experience with a simple before/after magic trick**.

The winning line is:

> **A budget-aware AI agent can still make the wrong decision if its prices are stale. LiveLLM turns live web changes into verified economic state before the agent spends money.**

---

# P0 — BUILD ONE DEPLOYED LIVE DEMO PAGE

ProofDesk and DomainArena now have public judge pages. LiveLLM needs the same treatment.

Do not submit a judge into:

```text
npm run radar
npm run glm-demo
npm run live-demo
open demo-report.html
```

Those are useful engineering demonstrations but too fragmented.

Build one public page, e.g.:

```text
LiveLLM
The live economic-state layer for AI agents

1. Stale Assumption
2. Live SerpApi Refresh
3. Verified Fact
4. Agent Decision
5. Evidence
```

Deploy it through Cloudflare Pages/Worker or another stable public endpoint.

## The visual transformation

The page must show the **same workload before and after** fresh market evidence:

```text
BEFORE
stale economic state
route: X
monthly cost: $A

          ↓ live SerpApi + verification

AFTER
verified current economic state
route: Y
monthly cost: $B
```

Only use a workload where the actual code/calculations produce a real route change or meaningful cost delta.

Do not hand-enter the winning numbers.

Add a regression test asserting the chosen canonical workload produces the expected before/after decision from the committed fact states.

---

# P0 — SHOW ONE GENUINELY LIVE SERPAPI CALL

Your current `live-agents.ts` demo explicitly runs the radar in **replay mode** using real captured SerpApi responses.

That is honest and good for determinism, but for a SerpApi sponsor demo I would show one unmistakably live call first.

Recommended recording structure:

1. run one low-cost real SerpApi search
2. show `search_metadata.id`
3. show engine + query + latency + current timestamp
4. optionally show Account API quota before/after
5. then say:

> “For deterministic reproduction, I’ll replay this class of captured real SerpApi response through the exact same downstream pipeline.”

6. run the known GLM promotion replay through verification/economics

This gives you both:

- real-time sponsor proof
- reliable demo execution

## Best live query

Use a rehearsed query around the current GLM/OpenCode/Z.ai economics if it reliably returns the official/current sources.

Example concept:

```text
GLM-5.3-Flash pricing OpenCode Go promotion Z.ai
```

Do not choose the final query until you have run it several times and confirmed useful results.

---

# P0 — MAKE SERPAPI’S ADVANCED FEATURES VISIBLE

Current SerpApi docs make your integration look better than the current UI communicates.

### Search Index

SerpApi’s Search Index is explicitly positioned as an **LLM-first index**, currently around 3 billion indexed pages, returning structured JSON and supporting `mode=deep` for expanded recall via parallel sub-query fan-out.

Docs:
https://serpapi.com/search-index-api

### JSON Restrictor

Works across engines and allows server-side field selection.

Docs:
https://serpapi.com/json-restrictor

SerpApi itself recently published examples where restriction cuts returned token volume by roughly 94–99% depending on engine/query.

### Account API

The Account API is free and exposes searches used/left, renewal date and throughput information.

Docs:
https://serpapi.com/account-api

### Light APIs

SerpApi recommends Light variants where critical information is sufficient and lower latency matters.

Your radar already uses Google News Light and Google Light.

## Put a small sponsor-tech panel on the live page

```text
SERPAPI LIVE

Google News Light      event detection
Google Light           official-source resolution
Search Index Deep      unknown-source discovery
JSON Restrictor        reduced agent payload
Search metadata ID     provenance / archive
Account API            quota governor
```

This is far more compelling than saying “powered by SerpApi.”

---

# HIGH-VALUE EXTRA CREDIT — MEASURE JSON RESTRICTOR SAVINGS YOURSELF

Because LiveLLM is explicitly an agent-economic system, token efficiency is relevant.

For the canonical live search, capture:

```text
raw JSON bytes/tokens
restricted JSON bytes/tokens
reduction %
```

Generate the result from actual responses.

Then show a tiny badge:

```text
SerpApi response
raw:       18,420 tokens
restricted: 714 tokens
reduction: 96.1%
```

Those numbers are examples only — use your measured result.

This is good sponsor usage because it proves you explored an advanced SerpApi primitive and ties directly into agent economics.

Optional later: SerpApi also just introduced Markdown output optimized for LLM/agent consumption. Interesting, but do not add it if it distracts from the JSON fact pipeline.

---

# P0 CLAIM HYGIENE — FIX CURRENT DOC DRIFT

The repo currently contradicts itself.

## Tests

README says:

```text
77 tests
```

Latest CI proves:

```text
76 tests
```

Use **76** until another green CI run proves otherwise.

## Endpoint count

README describes the original 7-route API.

`PITCH.md` says 9 HTTP endpoints but its table visually lists the `/v1/market?models=` query variant as if it were a separate endpoint.

Current server has these distinct HTTP route patterns:

```text
GET /v1/market
GET /v1/models/:model
GET /v1/economics/:model
GET /v1/changes
GET /v1/evidence/:id
GET /v1/ingestion/sources
GET /v1/market/gpu
GET /v1/health
GET /v1/x402/pricing
```

That is **9 route patterns**.

`?models=` is a filter on `/v1/market`, not another endpoint.

Normalize:

- README
- PITCH.md
- PITCH-PLAN.md
- server file header comment
- Devpost

## Model/route counts

Docs currently drift between 22/23 models and other figures.

Do not manually hardcode the headline count.

After canonical seed:

```bash
curl /v1/market | jq '.stats'
```

Use those exact values everywhere.

---

# P0 CLAIM HYGIENE — `/v1/ingestion/sources` CURRENTLY OVERCLAIMS

This endpoint is presently a hard-coded registry that labels multiple external systems with things such as:

```text
integration: ingest
items: ...
last_sync: ...
```

while the actual code path shown in the endpoint is static metadata, not proof that 14k+ records have truly been synchronized and verified.

Some listed source item counts are also vastly larger than the headline `total_ingested` figure.

Do not present this as an implemented ingestion pipeline unless it actually is one.

## Fast fix

Rename semantics to something like:

```text
/v1/discovery/sources
```

or keep endpoint but return honest fields:

```json
{
  "status": "candidate_source",
  "integration": "planned|manual_seed|live",
  "verified_records": 0
}
```

Only call a source `ingested` when records actually flowed through code and can be counted from storage.

For the hackathon, you can simply remove this endpoint from the main demo.

The SerpApi story is already strong without it.

---

# P0 CLAIM HYGIENE — GPU ENDPOINT IS A STATIC EXPERIMENT

`/v1/market/gpu` currently returns hard-coded GPU values labelled `verified: true` with an observed date.

That is useful schema exploration but not equivalent to the provenance-backed LLM pipeline.

Mark the whole endpoint unmistakably:

```text
EXPERIMENTAL_STATIC
```

or remove it from the hackathon demo.

Best hackathon framing:

> “The same schema generalizes next to GPU/cloud/API economics.”

Do not let static GPU data dilute the central proof that LLM economics are actually discovered and verified.

---

# P0 CLAIM HYGIENE — x402 IS CURRENTLY A PRICING MANIFEST, NOT PAYMENT

`/v1/x402/pricing` currently returns intended USDC/Base-Sepolia prices.

It does **not** implement an actual HTTP 402 payment challenge/settlement path in the audited server code.

Therefore do not say:

> “LiveLLM has an x402 paid endpoint.”

unless you wire real payment enforcement.

Fast honest options:

### Option A

Rename to:

```text
/v1/x402/manifest
```

and label:

```text
planned monetization / pricing manifest
```

### Option B

Actually implement the minimum x402 flow and demonstrate a paid call.

Given the submission deadline, I prefer Option A unless you already have the payment middleware ready elsewhere.

The startup model is still worth describing:

> verified economic state can become a cheap machine-paid primitive for agents.

Just separate vision from implementation.

---

# P1 — HERMES SHOULD NOT BE REQUIRED FOR THE JUDGE DEMO

The three-agent demo is conceptually excellent, but `live-agents.ts` shells out to:

```text
hermes -m mimo-v2.5
```

That creates an unnecessary external dependency and 60–90 second delay.

Also: the interesting invention is LiveLLM’s economic state, not whether MiMo can parse a JSON table.

## Better deployed demo

Use three deterministic agent profiles in the browser/server:

```text
Coding Agent
240 code reviews/day
large cached context
$50 budget

Research Agent
500 summaries/day
frontier quality

Batch Agent
500 classifications/day
near-zero budget
```

Feed all three the exact same `/v1/market` payload and calculate route economics with the same production economics code.

Show three different choices.

Then optionally have an expandable:

`show actual LLM reasoning replay`

with captured Hermes/MiMo outputs.

This is faster, deterministic and more credible.

---

# THE BEST CANONICAL DEMO CASE

The existing `glm-demo` is still the right core story because it demonstrates a subtle problem static pricing tables often miss:

```text
same model
same nominal model family
multiple providers
price discount vs usage multiplier
cached-input economics
subscription economics
promotion expiry
```

It is much more interesting than “model A costs $0.15.”

The website should transform that complexity into one visible route decision.

## Build a canonical workload fixture

For example, use the existing coding-agent workload pattern already represented in the economics code.

Create two temporal snapshots:

```text
T0 — stale assumptions
T1 — current verified promotional state
```

Both must be derived from fact-ledger fixtures, not hard-coded UI text.

Test:

```ts
expect(route(T0, workload)).toEqual(...)
expect(route(T1, workload)).toEqual(...)
expect(route(T0, workload)).not.toEqual(route(T1, workload))
```

If the current GLM facts do not produce an actual route flip, pick a workload that produces a meaningful cost change instead. Do not force fake numbers.

---

# EXACT VIDEO SCRIPT

Target: **2:35–2:55**.

## 0:00–0:13 — Hook

Screen: one agent workload with a stale route recommendation.

Say:

> “AI agents are becoming budget-aware. But a perfect budgeting algorithm still makes the wrong decision if its price assumptions are stale.”

## 0:13–0:28 — Product

> “LiveLLM turns the changing web into verified economic state that agents query before they spend money.”

Show:

```text
SerpApi → official source → validated fact → market payload → agent
```

## 0:28–0:52 — Genuine live SerpApi

Click `Refresh market`.

Show the live sponsor trace:

```text
Search Index / Google Light / News Light
query
200
latency
search_metadata.id
```

Say:

> “SerpApi is the discovery layer. We use fast Light searches for known signals and Search Index deep mode to explore unknown providers and offers.”

Then point to Search ID:

> “Every observation keeps the SerpApi search ID as provenance.”

## 0:52–1:16 — Verification

Show candidate → official source → extracted fact.

> “Search results are candidates, not truth. LiveLLM follows the official source, lets AI propose a structured fact, then deterministic code checks the evidence quote, numeric range, unit and entity before it enters the ledger.”

Show one rejected/accepted check if visually easy.

## 1:16–1:38 — Before/after economics

Show same workload again.

> “The market state has changed. The same agent workload now has different economics, so its route changes.”

Pause on actual before/after cost.

> “That is the product: not another model list, but verified economic state changing an autonomous decision.”

## 1:38–2:02 — Three agents, same payload

Show coding/research/batch cards.

> “LiveLLM doesn’t prescribe one best model. Three agents consume the same canonical payload and make different decisions because their workloads, quality requirements and budgets are different.”

## 2:02–2:21 — Evidence click

Click an evidence ID.

> “Any number can be inspected back through the evidence record, observation timestamp and official source. The fact is temporal, so new evidence supersedes it instead of silently overwriting history.”

## 2:21–2:38 — SerpApi depth / efficiency

Show small sponsor panel and, if implemented, JSON Restrictor measurement.

> “We also use SerpApi’s JSON Restrictor to reduce agent payloads, Account API to govern search credits, and Search Archive IDs so discovery remains reproducible.”

## 2:38–2:52 — Future

> “LLM pricing is the first market. The same primitive extends to GPU compute, APIs, storage and any resource an autonomous agent can buy.”

## 2:52–2:58 — Close

Return to the changed route.

> “LiveLLM: the live truth layer between an agent’s budget and the market it spends in.”

End on the decision, not a thank-you slide.

---

# WEBSITE DESIGN — EXACT PANELS

## Tab 1 — Agent task

```text
TASK
240 code reviews/day
uncached input ...
cached input ...
output ...
budget ...

STALE MARKET STATE
route ...
cost ...
```

Big button:

`REFRESH ECONOMIC STATE WITH SERPAPI`

## Tab 2 — Live discovery

Show only useful fields:

```text
engine
query
search_metadata.id
latency
results used
JSON restriction
credits/search quota
```

## Tab 3 — Verification

Three-column flow:

```text
DISCOVERED RESULT
→ OFFICIAL SOURCE
→ ACCEPTED FACT
```

Below accepted fact:

```text
quote found ✓
type ✓
range ✓
unit ✓
entity ✓
confidence ✓
```

## Tab 4 — Agent decisions

Before/after main agent at top.

Then three profile cards.

## Tab 5 — Evidence / Research

- evidence provenance chain
- current market stats
- JSON Restrictor measurement
- optional MarketTruthBench results

---

# EXTRA CREDIT — BUILD `MarketTruthBench`

ProofDesk has AuthorityBench and DomainArena can have DomainBench.

LiveLLM’s equivalent should be much smaller and focused:

> **MarketTruthBench — how quickly and reliably can an agent recover correct economic state from a changing web?**

Do not build a huge benchmark before the main site.

## Minimal experiment

Take a set of recorded provider state changes you already have or can reconstruct:

```text
promotion appears
promotion expires
input price changes
cached-input price changes
free-tier quota changes
subscription multiplier changes
```

For each event, store:

```text
old state
new ground truth
SerpApi result
official source
discovered candidate
extracted fact
validator result
final ledger state
```

Measure:

1. change detection success
2. extraction accuracy
3. validator false accept/reject
4. provenance completeness
5. searches/credits per verified change
6. response payload reduction from JSON Restrictor
7. downstream route change when economically material

The key metric is **decision relevance**, not scraping volume.

Example question:

> “How often does a web change actually alter the economically optimal route for a canonical workload?”

That is research directly connected to the product.

---

# OPTIONAL TECHNICAL PREPRINT

If MarketTruthBench produces enough real observations:

**Verified Economic State for Autonomous Agents: From Live Web Search to Budget-Aware Routing**

5–7 pages is enough.

Sections:

1. Problem: stale economic state
2. LiveLLM temporal fact model
3. SerpApi discovery strategy
4. official-source verification
5. economic derivation
6. MarketTruthBench
7. downstream agent routing
8. limitations

Do not call it an arXiv paper unless actually submitted.

---

# CURRENT SERPAPI FRONTIER — USE THIS IN THE PITCH

Current SerpApi product direction strongly supports the LiveLLM thesis:

- Search Index is explicitly LLM-first and can output JSON or Markdown
- `mode=deep` fans out search for expanded recall
- JSON Restrictor works server-side across engines
- Light APIs trade richness for faster critical results
- Account API provides free quota/throughput telemetry
- search metadata IDs provide durable search identity
- SerpApi recently published agent examples centered on reducing context/token waste

This means a good framing is:

> **SerpApi gives agents a live, structured view of the web. LiveLLM converts that view into durable economic state with evidence, temporal semantics and agent-specific calculations.**

That is much stronger than “we use Google search to scrape prices.”

---

# REPO CLEANUP

Current root has useful but judge-noisy files such as:

```text
DEV-PLAN.md
HANDOVER-2026-08-30.md
PITCH-PLAN.md
PITCH.md
COMPETITIVE-LANDSCAPE.md
```

Keep `PITCH.md` or move it under docs, but make the root feel like a product.

Suggested root:

```text
README.md
DEMO.md
SUBMISSION.md
LICENSE
package.json
src/
tests/
fixtures/
docs/
site/
```

Move internal handovers/plans to:

```text
docs/archive/
```

README top should eventually be:

```text
[Live Demo] [Demo Video] [API] [Evidence Example] [Research]
```

---

# TEST / ENGINEERING POLISH

CI is green, which is excellent.

Do these smaller cleanup items only after the site works:

- README `76 tests`, not 77
- fix ts-jest `isolatedModules` warning if trivial
- clean-clone test:

```bash
git clone ...
npm ci
npm run build
npm test
npm run migrate
npm run seed
npm run seed-economics
npm run serve
curl localhost:3847/v1/market
```

- add hosted-demo smoke test if possible
- add canonical workload before/after regression test
- add live/replay mode labelling tests

---

# DO NOT SPEND TIME ON

Do not:

- add more static GPU prices
- integrate ten external price databases
- implement a whole marketplace
- add more LLM models just to raise model count
- rebuild MCP
- build full x402 unless nearly done already
- create elaborate research before the public page exists

The product has enough depth.

---

# EXECUTION ORDER

## Block A — claim cleanup

1. test count = 76
2. HTTP route count = 9
3. derive model/route count from current `/v1/market`
4. mark/remove static GPU as experimental
5. mark external-source registry honestly
6. rename/qualify x402 pricing manifest

## Block B — deployed judge demo

1. one public page
2. canonical workload
3. stale baseline
4. one live SerpApi call
5. live Search ID
6. known replay through full verification pipeline
7. updated market payload
8. visible before/after agent decision
9. evidence click
10. three deterministic agent profiles

## Block C — SerpApi extra depth

1. JSON Restrictor measured reduction
2. Account API quota widget
3. show Light vs Search Index roles
4. Search Archive/provenance presentation

## Block D — research

1. minimal MarketTruthBench
2. one decision-relevance chart
3. one search-efficiency/provenance chart
4. optional preprint

## Block E — recording/submission

1. rehearse exact query
2. record one clean 2:45-ish screencast
3. show genuine live SerpApi before replay
4. no Hermes dependency during main take
5. Devpost focuses on verified economic state, not generic pricing API

---

# FINAL ACCEPTANCE CHECKLIST

- [ ] CI green
- [ ] README says 76 tests
- [ ] endpoint counts normalized
- [ ] model/route counts runtime-derived
- [ ] no hard-coded claims that external sources were ingested when they were not
- [ ] GPU endpoint clearly experimental/static or removed from main story
- [ ] x402 described honestly
- [ ] stable public demo exists
- [ ] one genuine live SerpApi search occurs on camera
- [ ] `search_metadata.id` visible
- [ ] JSON Restrictor visible/measured
- [ ] Account API quota visible if easy
- [ ] replay labelled replay
- [ ] official source distinct from search result
- [ ] deterministic validator visible
- [ ] before/after economic decision uses real derived numbers
- [ ] evidence chain clickable
- [ ] main demo does not require Hermes
- [ ] 2–3 minute video

## Final positioning

> **LiveLLM is not a price database. It is a temporal economic-state service for autonomous agents: SerpApi discovers what changed, official sources establish evidence, deterministic validation turns evidence into facts, and agents consume those facts before routing spend.**

The repo already proves most of the technical substance. The highest-value work now is to make the sponsor integration and downstream decision change visible in one public page.
