# LiveLLM — Competitive Landscape & Research Reference
**Date:** 2026-08-31

## Category Thesis

Autonomous agents are becoming budget-aware, but their budgets are only useful if their economic assumptions are accurate. LiveLLM turns the changing web into small, verifiable reference payloads that agents can safely use as economic state.

## The Pitch

**Existing systems answer:** "How much does Claude cost?"

**LiveLLM answers:** "What are the economic conditions under which an agent can use Claude right now, where did those facts come from, when were they observed, what changed, and can I safely use them in an autonomous decision?"

**Headline:** Verified economic intelligence for autonomous agents.

**Core primitive:** An economic reference asset:
```json
{
  "asset": "inference:anthropic/claude-sonnet-5",
  "observed_at": "2026-08-31T07:12:31Z",
  "valid_from": "2026-08-29T00:00:00Z",
  "economics": {
    "input_usd_per_million": 2.00,
    "output_usd_per_million": 10.00,
    "cache_read_usd_per_million": 0.20
  },
  "constraints": { "context": 1000000, "region": "global" },
  "evidence": {
    "source_type": "official_provider",
    "source_url": "...",
    "observed_hash": "sha256:...",
    "verification_state": "verified"
  }
}
```

## Competitive Landscape

### Direct competitors
| Project | What it proves | What we take |
|---------|---------------|--------------|
| **AgentDeals** | Agents need current prices, free tiers, credits | Strongest external validation of thesis |
| **CloudPrice AI** | Developers want normalized model pricing APIs | Shows raw LLM pricing is commoditizing |
| **models.dev** | Model metadata in machine-readable DB | Great upstream/reference source |
| **Artificial Analysis API** | Price alone isn't enough; need quality/latency | Add performance/economic attributes |
| **OpenRouter Models API** | Routing already price/performance-aware | Our payload feeds routers |
| **GPUCloudPrices** | Live normalized GPU pricing useful as JSON | Natural second domain |
| **ComputePrices** | Cross-provider GPU comparison is substantial | Shows compute-price fragmentation |
| **Shadeform** | Price + availability drives execution | Observe→compare→decide→purchase→execute |
| **Vast.ai** | Compute is dynamic marketplace/order book | Ingest supply/reliability/region |
| **Spare Cores** | Standardized compute inventory + prices + benchmarks | Aligned with oracle idea |
| **Infracost Pricing API** | Normalized pricing DB becomes infrastructure | Best mature analogy |
| **cloudprice-mcp** | MCP-compatible agents want structured pricing | Direct evidence interface is emerging |

### Positioning
- **CloudPrice** = pricing database (let them win that game)
- **LiveLLM** = evidence-backed economic facts suitable for autonomous decisions
- **AgentDeals** showed agents need current deal context; LiveLLM generalizes into verifiable economic state

### Data sources we can ingest
- models.dev (model metadata)
- GPUCloudPrices (GPU pricing JSON)
- ComputePrices (70+ providers, 70+ GPU models)
- Spare Cores (5,000+ server types, historical pricing)
- Infracost (10M+ AWS/Azure/GCP prices)
- AgentDeals (1,580+ deals, MCP + REST)
- OpenRouter (routing data)

### SerpApi role
Search is NOT just another source. It's the **change-detection and source-discovery mechanism**:
1. SerpApi discovers provider announcement
2. Official page confirms
3. Cross-reference with existing sources
4. Emit canonical fact with provenance

## Research References

### BATS — Budget-Aware Tool-Use Enables Effective Agent Scaling (Google, COLM 2026)
- Budget Tracker + BATS alters planning based on remaining resources
- Giving agents more tool calls doesn't produce effective scaling
- Making agents aware of budget produces better cost-performance frontier
- **Hook:** Budget optimizer is only as correct as economic state it receives

### CATS — Cost-effective Agent Test-Time Scaling (Google Research, 2026)
- Dual cost of tokens + tool calls
- Unified cost metric + budget-aware resource allocation
- Higher accuracy using fewer tool calls and lower total cost
- **Hook:** BATS/CATS answer "how to allocate"; LiveLLM answers "what are the costs"

### The research argument
BATS deciding `Claude call = $0.08` when Claude has changed pricing → wrong economic decision despite mathematically excellent planning. **Stale inputs kill budget-aware agents.**

## Architecture

```
                    VERIFIED ECONOMIC ORACLE

                           /reference
                                │
        ┌──────────────┬────────┼────────┬───────────────┐
        │              │        │        │               │
       LLM            GPU     CLOUD     TOOLS          DEALS
        │              │        │        │               │
   OpenRouter       Vast.ai  Infracost  API prices   AgentDeals
   providers        Shadeform SpareCores x402        credits
   promotions       RunPod   AWS/GCP    SaaS         free tiers
   subscriptions    etc.     Azure      MCP          expirations
        │              │        │        │               │
        └──────────────┴────────┼────────┴───────────────┘
                                │
                   normalized reference facts
                                │
                provenance / validity / confidence
                                │
              ┌─────────────────┴──────────────────┐
              │                                    │
          Moltwork Lab                         Any Agent
              │                                    │
       learned capability                    BATS / CATS
       success estimates                     routers
       past outcomes                         coding agents
              │                              schedulers
              └──────────────────┬─────────────────┘
                                 │
                         ECONOMIC DECISION
```

## Economic Decision Framework

```
EV(action) = reward × P(success | agent, task)
           − compute cost
           − tool costs
           - search costs
           − capital costs
           − opportunity cost
```

LiveLLM supplies trustworthy external inputs for almost every term.

## Progression

1. **Today:** LLM inference economics
2. **Next:** GPU/compute economics
3. **Next:** API/tool-call economics
4. **Next:** Credits/free tiers/promotions
5. **Next:** Storage/network/cloud resources
6. **Eventually:** Anything an agent can spend money on

## Demo Story (2-3 minutes)

1. Agent has stale assumptions
2. Provider changes pricing/promotion/free quota
3. SerpApi detects the change
4. LiveLLM resolves the official source
5. AI extracts the candidate fact
6. Deterministic validator checks it
7. Fact enters temporal ledger with provenance
8. `/v1/market` changes
9. Three agents consume the same update
10. Each makes a different economically rational decision

## Moltwork Integration

LiveLLM shouldn't own pricing intelligence internally. It consumes this oracle just like any other agent. The private moat is Moltwork's accumulated capabilities/outcomes while the public oracle becomes infrastructure.

```
Moltwork Oracle  → opportunity/work state (what exists)
LiveLLM          → economic state (what things cost)
Moltwork Lab     → capability state (what agents are good at)
Worker           → decision-maker (EV calculation)
```

## Hackathon Alignment (DevNetwork)

| Criterion | LiveLLM |
|-----------|---------|
| Originality | Economic oracle, not search chatbot |
| Technical execution | Fact ledger + validation + provenance + temporal |
| SerpApi integration | News Light + Google Light + Search Index + JSON Restrictor + Search IDs |
| Usability | `/v1/market`, economics API, evidence API, MCP |
| Impact | Every autonomous router needs live economic state |

**First place:** $1,000 cash + $1,000 credits
