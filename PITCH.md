# LiveLLM — Pitch Document
**DevNetwork API + Cloud + AI Hackathon 2026**

---

## One-liner

**Verified economic intelligence for autonomous agents.**

## The Problem

Agents are becoming budget-aware (Google's BATS/CATS research proves this), but their budgets are only useful if their economic assumptions are accurate.

An agent reasoning trace looks like:

```
GOAL: Earn > $20 from this task
KNOWN CAPABILITIES: P(success | coding task) = 0.71
BUDGET: $5.00 remaining
```

But what if the agent's cost assumptions are **wrong**?

- Claude changed pricing last week
- A cheaper equivalent model appeared
- The user's subscription gives them effectively-free calls
- An OpenCode promotion provides 2× quota
- GPU inference has temporarily become cheaper

**The planning algorithm can be mathematically excellent and still make the wrong economic decision because the inputs are stale.**

## The Solution

LiveLLM turns the changing web into small, verifiable reference payloads that agents can safely use as economic state.

```
SerpApi Discovery → Official Source → AI Extraction → Fact Ledger → GET /v1/market
```

**Existing systems answer:** "How much does Claude cost?"

**LiveLLM answers:** "What are the economic conditions under which an agent can use Claude right now, where did those facts come from, when were they observed, what changed, and can I safely use them in an autonomous decision?"

## What Makes This Different

### Not another pricing API

| Pricing Database | LiveLLM |
|-----------------|---------|
| Static JSON dump | Temporal fact ledger with provenance |
| Trust the number | Verify against official sources |
| One snapshot | Detects changes via SerpApi |
| No evidence | Full provenance bundle per fact |
| LLM only | Generalizes to GPU, cloud, tools |

### The core primitive

```json
{
  "asset": "inference:anthropic/claude-sonnet-5",
  "observed_at": "2026-08-31T07:12:31Z",
  "valid_from": "2026-08-29T00:00:00Z",
  "economics": {
    "input_usd_per_million": 2.00,
    "output_usd_per_million": 10.00
  },
  "evidence": {
    "source_type": "official_provider",
    "verification_state": "verified",
    "search_observation": "SerpApi detected pricing page change"
  }
}
```

Small payload. Timestamped. Evidence-backed. Machine-readable.

## The Moat: Canonical Endpoint + x402 Trust

### The fragmentation problem

Today, agents that need economic data face a fragmented landscape:
- **AgentDeals** — deals/free tiers only, no pricing
- **CloudPrice** — LLM pricing only, no verification
- **GPUCloudPrices** — GPU only, no provenance
- **cloudprice-mcp** — AWS/Azure/GCP, no change detection
- **Infracost** — cloud infra, no agent integration

Each MCP server is **unreliable by design** — no verification, no temporal tracking, no provenance. Agents can't trust them for autonomous decisions.

### Why agents trust by volume

Agents currently build trust through **repeated successful calls** — if an endpoint returns consistent data 100 times, the agent assumes it's reliable. But this breaks when:
- The source goes stale
- The provider changes pricing
- The MCP server disappears
- The data conflicts with another source

**Volume-based trust is fragile.** One wrong answer at the wrong time can cost an agent its entire budget.

### LiveLLM's moat: verification + x402

LiveLLM provides what no fragmented MCP can:

1. **Verification** — every fact traced to official sources via SerpApi
2. **Temporal state** — when was this observed, when did it change
3. **Provenance** — full evidence bundle for every number
4. **x402 payment** — agents pay per-query, creating economic alignment

With x402, the endpoint becomes **self-sustaining**:
- Agent pays $0.001 per query
- Revenue funds SerpApi credits + infrastructure
- More agents = more revenue = more verification capacity
- The endpoint improves as it scales

### The flywheel

```
Agent queries LiveLLM
    ↓
Pays via x402 ($0.001/query)
    ↓
Revenue funds SerpApi discovery
    ↓
More sources verified
    ↓
More agents trust endpoint
    ↓
More queries
    ↓
More revenue
    ↓
Better verification
```

### Why this matters for autonomous agents

An agent starting a large task (e.g., "build a SaaS app and launch it") needs to know:
- What LLM to use (cheapest for the task)
- What GPU to rent (if local inference is better)
- What APIs to call (cheapest tool-call pricing)
- What credits are available (free tiers, promotions)
- What the total cost will be (budget planning)

Today, the agent would:
1. Search for pricing (fragile, unverified)
2. Assume prices are current (often wrong)
3. Start the task
4. Discover mid-task that prices changed
5. Either eat the cost or restart

With LiveLLM, the agent:
1. Calls `/v1/market` before starting (verified, timestamped)
2. Gets economic state with provenance
3. Plans budget with accurate numbers
4. Starts the task with confidence
5. Re-checks periodically if the task is long

**This becomes a daily ritual for agents** — just as humans check market prices before making financial decisions, agents check LiveLLM before making economic decisions.

### The canonical endpoint

Instead of 10 fragmented MCPs with unverified data, agents have **one endpoint they can trust**:

```
GET /v1/market          — all LLM pricing, verified
GET /v1/market/gpu      — GPU compute, verified
GET /v1/economics/:model — cost-per-1K, verified
GET /v1/evidence/:id    — full provenance
GET /v1/changes         — what changed recently
```

One endpoint. Multiple domains. All verified. All timestamped. All with evidence.

**That's the product.**

## The Demo (2 minutes)

1. **Stale agent** — has old pricing assumptions
2. **SerpApi detects change** — provider updated pricing page
3. **LiveLLM resolves** — fetches official source, extracts fact
4. **Validator checks** — deterministic validation passes
5. **Fact enters ledger** — temporal, provenance-backed
6. **`/v1/market` changes** — new prices live
7. **3 agents consume** — each makes different economically rational decision

```bash
# Agent 1: Routes to cheapest provider
curl localhost:3847/v1/economics/GLM-5.3-Flash
# → "Use Z.ai — 50% off promotion until Sept 9"

# Agent 2: Checks free tier
curl localhost:3847/v1/market?models=gpt-4o-mini
# → "OpenCode offers 2× usage quota"

# Agent 3: Compares GPU vs API
curl localhost:3847/v1/market/gpu
# → "H100 at $1.89/hr on vast.ai vs $2.18 API cost — rent GPU"
```

## SerpApi Integration (Deep)

- **News Light** — detect provider announcements
- **Google Light** — verify pricing pages
- **Search Index Deep** — discover new providers
- **JSON Restrictor** — structured extraction from HTML
- **Search Archive IDs** — provenance for every observation
- **Account API** — quota governance

**Search is not just another source. It's the change-detection mechanism.**

## Research Backing

**Google BATS (COLM 2026):** Budget-aware tool-use produces better cost-performance frontier than just giving agents more tools.

**Google CATS (2026):** Higher accuracy using fewer tool calls + lower total cost via budget-aware allocation.

**The gap:** BATS/CATS answer "how to allocate resources." LiveLLM answers "what those resources actually cost right now."

A budget optimizer is only as correct as the economic state it receives.

## Progression

```
Today:   LLM inference economics (22 models, 8 providers)
Next:    GPU/compute economics (5 verified routes)
Then:    API/tool-call economics
Then:    Credits/free tiers/promotions
Then:    Storage/network/cloud resources
Future:  Anything an agent can spend money on
```

## Tech Stack

- TypeScript + Node.js
- SQLite (bitemporal fact ledger)
- SerpApi (change detection + source discovery)
- AI extraction (mimo-v2.5)
- Deterministic validation
- MCP server (read-only)
- 7 HTTP API endpoints

## Submission

**Hackathon:** DevNetwork API + Cloud + AI 2026
**Category:** Track 2 — SerpApi Integration
**Prize:** $1,000 cash + $1,000 credits
**Repo:** github.com/prx0r/livellm

## Key Files

```
src/api/server.ts       — HTTP API (7 endpoints)
src/radar.ts            — SerpApi discovery pipeline
src/facts/              — Fact ledger + validation
src/pipeline/           — Promotions, changes, economics
src/mcp/server.ts       — MCP tools (read-only)
tests/                  — 76 passing tests
fixtures/recorded/      — SerpApi + source fixtures
COMPETITIVE-LANDSCAPE.md — Full competitive analysis
```
