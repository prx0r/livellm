# LiveLLM

**The live truth layer for AI agents.**

LLM model prices change faster than static knowledge can keep up. LiveLLM discovers market changes through SerpApi, verifies them against official sources, and serves compact, provenance-backed economic facts that agents consume before routing tasks.

```
SerpApi Discovery → Official Source → AI Extraction → Fact Ledger → /v1/market
```

## Why This Exists

Agents making routing decisions based on stale pricing data waste money. A coding agent choosing a model based on last month's prices might pay 10× more than necessary. LiveLLM amortizes SerpApi search into a reusable economic payload — one query answers thousands of agent routing decisions.

## Quick Start

```bash
npm ci && npm run build
npm run migrate && npm run seed && npm run seed-economics
npm run serve &
```

Try it:
```bash
# Market snapshot — all models, pricing, capabilities
curl http://localhost:3847/v1/market

# Filter to one model
curl http://localhost:3847/v1/market?models=claude

# Economics for a model — agents compute costs from this
curl http://localhost:3847/v1/economics/GPT-4o

# Trace provenance of any fact
curl http://localhost:3847/v1/evidence/<evidence-id>
```

## API

| Endpoint | Method | Description |
|---|---|---|
| `/v1/market` | GET | Full market snapshot — all models, pricing, capabilities, promotions, free tiers |
| `/v1/market?models=X` | GET | Filter to specific models |
| `/v1/economics/:model` | GET | Pricing facts + cost-per-1K for a model |
| `/v1/models/:model` | GET | Detailed facts per route with evidence IDs |
| `/v1/changes` | GET | Recent market changes (filterable by `?since=ISO`) |
| `/v1/evidence/:id` | GET | Full provenance bundle — source, observation, verification |
| `/v1/health` | GET | Health check |

## Market Payload Example

```json
{
  "model": "Claude Sonnet 4",
  "routes": [{
    "provider": "Anthropic",
    "input": 3,
    "output": 15,
    "cached_input": 0.3,
    "context_tokens": 200000,
    "max_output_tokens": 64000,
    "modalities": "text+image+pdf",
    "freshness": {
      "as_of": "2026-08-30T12:00:00Z",
      "confidence": 1.0,
      "evidence_id": "..."
    }
  }]
}
```

## Architecture

```
SerpApi (Google Light, News, Search Index)
    ↓
Candidate Detection (prefilter scoring)
    ↓
Official Source Fetch
    ↓
AI Structured Extraction (mimo-v2.5)
    ↓
Deterministic Validation (evidence, range, unit, confidence)
    ↓
Fact Ledger (temporal, bitemporal, provenance-backed)
    ↓
GET /v1/market → Agent → Routing Decision
```

## Demo

```bash
# Run the 3-agent demo
npm run serve &
npm run live-demo
open demo-report.html
```

Three agents with different needs receive the same canonical market payload and independently compute costs and make routing decisions.

## Run SerpApi Radar

```bash
# Replay mode (zero credits, uses recorded fixtures)
npm run radar --mode replay

# Live mode (requires SERPAPI_API_KEY in .env)
SERPAPI_API_KEY=sk_... npm run radar --mode live
```

## Tests

```bash
npm test          # 76 tests, zero credits (replay mode)
npm run build     # TypeScript compilation
```

## Data Integrity

Every fact in the ledger is traceable:
- **evidence_id** → links to the evidence record
- **observation_id** → links to the source observation (when it was fetched)
- **source_id** → links to the official source URL
- **verification_state** → `seed_bootstrap` (from seed data) or `verified` (from live pipeline)

Seed data uses real official pricing page URLs with real observation timestamps.

## Submission

DevNetwork API + Cloud + AI Hackathon 2026
Deadline: September 3, 2026 at 10:00 AM PDT
