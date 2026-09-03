# LiveLLM

**The live market-data layer for AI agents.**

[![Hackathon](https://img.shields.io/badge/DevNetwork_API%2BCloud%2BAI_Hackathon-2026-blue)](https://api-cloud-ai-hackathon-2026.devpost.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-76_passing-brightgreen)](#tests)

> Agents making routing decisions on stale pricing data waste money. A coding agent choosing a model based on last month's prices might pay 10x more than necessary.

**[Watch Demo](https://youtu.be/PLACEHOLDER)** | **[Try Live API](https://livellm.prx0r.workers.dev/v1/market)** | **[View Source](https://github.com/prx0r/livellm)**

---

## Judge in 30 Seconds

**Sponsor API:** [SerpApi](https://serpapi.com) — the only API that can discover real-time LLM pricing changes across providers.

**Core workflow:**
```
Stale market state
  → SerpApi live discovery (Google News Light + Google Light + Search Index Deep)
  → Official source fetch
  → AI structured extraction (mimo-v2.5)
  → Deterministic validation (6 checks)
  → Verified market fact
  → Agent makes a different (cheaper) routing decision
```

**The magic moment:** Three agents receive the same market payload. A coding agent picks a 1M-context route. A research agent picks the cheapest frontier model. A batch agent picks a free-tier model. Same data, different decisions — LiveLLM is why they can make those decisions.

**Live API:** `https://livellm.prx0r.workers.dev/v1/market` — 23 models, real pricing, provenance-backed.

**What SerpApi does:** Discovers price changes, new promotions, and quota updates that static knowledge misses. Every fact in the system traces back to a SerpApi search with stored `search_metadata.id` for replay within 31 days.

---

## What LiveLLM Does

LiveLLM discovers market changes through **SerpApi**, verifies them against **official sources**, and serves compact, provenance-backed economic facts via a REST API. One SerpApi query amortizes into thousands of agent routing decisions.

```
SerpApi Discovery  →  Official Source Fetch  →  AI Extraction  →  Deterministic Validation  →  Fact Ledger
                                                                                                    ↓
                                                                                          GET /v1/market  →  Agent  →  Smarter Route
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     SERPAPI LAYER                            │
│  Google News Light    Google Light    Search Index Deep       │
│  (event detection)    (source resolve) (exploration)          │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                  CANDIDATE DETECTION                         │
│  Prefilter scoring → Official source resolution              │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│               AI STRUCTURED EXTRACTION                       │
│  mimo-v2.5 extracts pricing facts from official pages        │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│              DETERMINISTIC VALIDATION                        │
│  Evidence quote • Range check • Unit check • Confidence      │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    FACT LEDGER                               │
│  Bitemporal • Provenance-backed • Content-addressed          │
│  GET /v1/market → Agent → Routing Decision                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
git clone https://github.com/prx0r/livellm.git
cd livellm
npm ci && npm run build
npm run migrate && npm run seed && npm run seed-economics
npm run serve &
```

```bash
# Full market snapshot — 23 models, pricing, capabilities, promotions
curl http://localhost:3847/v1/market

# Filter to specific models
curl http://localhost:3847/v1/market?models=claude

# Pricing facts + cost-per-1K for agents
curl http://localhost:3847/v1/economics/GPT-4o

# Full provenance bundle — source, observation, verification
curl http://localhost:3847/v1/evidence/<evidence-id>
```

---

## API — 7 Endpoints

| Endpoint | Description |
|---|---|
| `GET /v1/market` | Full market snapshot — 23 models, pricing, capabilities, promotions, free tiers |
| `GET /v1/market?models=X` | Filter to specific models |
| `GET /v1/economics/:model` | Pricing facts + cost-per-1K for agent routing |
| `GET /v1/models/:model` | Detailed facts per route with evidence IDs |
| `GET /v1/changes` | Recent market changes (filterable by `?since=ISO`) |
| `GET /v1/evidence/:id` | Full provenance bundle — source, observation, verification |
| `GET /v1/health` | Health check |

---

## SerpApi Integration

| Feature | Purpose |
|---|---|
| Google News Light | Event detection — price cuts, new promotions, quota changes |
| Google Light | Official source resolution — Related Questions, Related Searches |
| Search Index Deep | Exploration — unknown providers and offers |
| JSON Restrictor | Payload reduction — engine-specific field selection |
| Account API | Quota governance — progressive budget tightening |
| `search_metadata.id` | Search Archive provenance — every fact traces to a search |

---

## MCP Server

```bash
npm run mcp
```

5 read-only tools for AI agents:

| Tool | Description |
|---|---|
| `get_market_snapshot` | Full market data for routing decisions |
| `get_model_details` | Detailed pricing for a specific model |
| `get_recent_changes` | Market changes since a given time |
| `get_candidates` | Available models matching criteria |
| `compare_models` | Side-by-side economics comparison |

---

## Key Features

### LLM Economics Engine

Not just price lookup — a genuine economic model:

- **Cost-per-request** from actual token distributions (uncached input, cached input, output)
- **Effective multiple** — value ratio vs. cost (e.g., MiMo V2.5 = 6x value)
- **Reconciliation** — detects when simulated costs disagree with provider-stated values
- **Provider-specific workloads** — real-world token patterns from coding agents

### Temporal Fact System

Five distinct information layers that most projects collapse into one:

```
Search Result (unverified) → Official Source (evidence) → Validated Claim (fact)
    → Calculation (derivation) → Assessment
```

Every fact is bitemporal (`valid_from`/`valid_to`), carries a confidence score, links to evidence, and has a verification state.

### AI Proposes, Code Validates

AI extracts facts from official pages. Deterministic code validates them:

1. Evidence quote must appear in the source document
2. Numeric type check
3. Range check (field-specific min/max)
4. Unit/field compatibility
5. Confidence threshold (≥ 0.5)
6. Entity validity

### Promotion Arbitrage Detection

Detects the same model at different effective economics across providers:

| Model | Route | Effective Cost |
|---|---|---|
| Z.ai GLM-5.3-Flash | 50% price discount | $0.075/$0.25 |
| OpenCode Go GLM-5.3-Flash | 2x usage multiplier | $0.15/$0.5 |

### Content-Addressed Provenance

Every SerpApi response stored with SHA-256 content hash. Every fact traces back:

```
fact → evidence → source observation → official source URL
```

### Quota Governor

Progressive budget tightening when credits are low:

| Credits Left | Max Searches/Cycle |
|---|---|
| Normal | 4 |
| ≤ 100 | 2 |
| ≤ 50 | 1 |
| Reserve (20) | Never spent |

---

## 3-Model Agent Demo

Three agents with different needs receive the same canonical payload and make different decisions:

| Agent | Need | Chooses |
|---|---|---|
| Coding Agent | Large context | Route with 1M context window |
| Research Agent | Frontier quality | Cheapest frontier model |
| Batch Classifier | Lowest cost | Free-tier model |

Same data, different decisions — this is why agents need LiveLLM.

---

## Tests

```bash
npm test          # 76 tests, zero credits (replay mode)
npm run build     # TypeScript compilation
```

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Database:** SQLite (better-sqlite3)
- **Search:** SerpApi (Google News Light, Google Light, Search Index Deep)
- **Extraction:** mimo-v2.5 (AI structured extraction)
- **Validation:** Deterministic (evidence, range, unit, confidence)
- **Deployment:** Cloudflare Workers
- **Protocol:** MCP (Model Context Protocol)

---

## License

MIT

---

**DevNetwork API + Cloud + AI Hackathon 2026**
