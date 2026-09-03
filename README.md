# LiveLLM

**The live market-data layer for AI agents.**

LLM model prices change faster than static knowledge can keep up. LiveLLM discovers market changes through SerpApi, verifies them against official sources, and serves compact, provenance-backed economic facts that agents consume before routing tasks.

```
SerpApi Discovery -> Official Source -> AI Extraction -> Fact Ledger -> GET /v1/market
```

## Why This Exists

Agents making routing decisions based on stale pricing data waste money. A coding agent choosing a model based on last month's prices might pay 10x more than necessary. LiveLLM amortizes SerpApi search into a reusable economic payload -- one query answers thousands of agent routing decisions.

## Quick Start

```bash
npm ci && npm run build
npm run migrate && npm run seed && npm run seed-economics
npm run serve &
```

Try it:
```bash
curl http://localhost:3847/v1/market
curl http://localhost:3847/v1/market?models=claude
curl http://localhost:3847/v1/economics/GPT-4o
curl http://localhost:3847/v1/evidence/<evidence-id>
```

## API (7 endpoints)

| Endpoint | Method | Description |
|---|---|---|
| `/v1/market` | GET | Full market snapshot -- 23 models, pricing, capabilities, promotions, free tiers, verification_state |
| `/v1/market?models=X` | GET | Filter to specific models |
| `/v1/economics/:model` | GET | Pricing facts + cost-per-1K for agents |
| `/v1/models/:model` | GET | Detailed facts per route with evidence IDs |
| `/v1/changes` | GET | Recent market changes (filterable by `?since=ISO`) |
| `/v1/evidence/:id` | GET | Full provenance bundle -- source, observation, verification |
| `/v1/health` | GET | Health check |

## Architecture

```
SerpApi (Google Light, News Light, Search Index Deep)
    |
Candidate Detection (prefilter scoring)
    |
Official Source Fetch
    |
AI Structured Extraction (mimo-v2.5)
    |
Deterministic Validation (evidence, range, unit, confidence)
    |
Fact Ledger (temporal, bitemporal, provenance-backed)
    |
GET /v1/market -> Agent -> Routing Decision
```

## SerpApi Integration

| Feature | Purpose |
|---|---|
| Google News Light | Event detection -- price cuts, new promotions, quota changes |
| Google Light | Official source resolution -- Related Questions, Related Searches |
| Search Index Deep | Exploration -- unknown providers and offers |
| JSON Restrictor | Payload reduction -- engine-specific field selection |
| Account API | Quota governance -- progressive budget tightening |
| `search_metadata.id` | Search Archive provenance -- every fact traces to a search |

## MCP Server

```bash
npm run mcp
```

5 read-only tools: `get_market_snapshot`, `get_model_details`, `get_recent_changes`, `get_candidates`, `compare_models`. `run_radar` excluded to prevent agents spending credits.

## Tests

```bash
npm test          # 76 tests, zero credits (replay mode)
npm run build     # TypeScript compilation
```

## Data Integrity

Every fact in the ledger is traceable:
- **evidence_id** -> links to the evidence record
- **observation_id** -> links to the source observation (when it was fetched)
- **source_id** -> links to the official source URL
- **verification_state** -> `seed_bootstrap` (from seed data) or `verified` (from live pipeline)

Seed data uses real official pricing page URLs with real observation timestamps.

---

## What We Built

### LLM Economics Engine

A genuine economic model for LLM subscriptions, not just price lookup:

- **Cost-per-request** computed from actual token distributions (uncached input, cached input, output)
- **Effective multiple** -- how much value you get vs what you pay (e.g., MiMo V2.5 = 6x value)
- **Reconciliation** -- detects when simulated costs disagree with provider-stated usage values
- **Provider-specific workloads** -- real-world token patterns from coding agents (830 uncached + 71,500 cached + 295 output per request)

### Temporal Fact System

Separates five distinct information layers that most projects collapse into one:

```
Search Result (unverified) -> Official Source (evidence) -> Validated Claim (fact)
    -> Calculation (derivation) -> Assessment
```

Every fact is bitemporal (valid_from/valid_to), carries a confidence score, links to evidence, and has a verification state.

### AI Proposes, Code Validates

The AI extracts facts from official pages. Deterministic code validates them:

1. Evidence quote must appear in the source document
2. Numeric type check
3. Range check (field-specific min/max)
4. Unit/field compatibility
5. Confidence threshold (>= 0.5)
6. Entity validity

### Promotion Arbitrage Detection

Detects that the same model has different effective economics across providers:

- **Z.ai GLM-5.3-Flash**: 50% price discount ($0.075/$0.25)
- **OpenCode Go GLM-5.3-Flash**: 2x usage multiplier ($0.15/$0.5)

The system identifies which route is cheaper for specific workloads.

### Content-Addressed Provenance

Every SerpApi response is stored with a SHA-256 content hash. Every fact traces back through:

```
fact -> evidence -> source observation -> official source URL
```

Search IDs are stored for Search Archive replay within 31 days.

### Quota Governor

Progressive budget tightening when credits are low:

- Normal: up to 4 searches per cycle
- <= 50 credits left: max 1 search
- <= 100 credits left: max 2 searches
- Reserve of 20 credits never spent

### 3-Model Agent Demo

Three agents with different needs receive the same canonical payload and make different decisions:

- **Coding Agent**: needs large context, picks route with 1M context window
- **Research Agent**: needs frontier quality, picks cheapest frontier model
- **Batch Classifier**: needs lowest cost, picks free-tier model

This demonstrates why agents need LiveLLM -- same data, different decisions.

---

DevNetwork API + Cloud + AI Hackathon 2026
