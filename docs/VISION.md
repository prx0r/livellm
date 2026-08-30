# LiveLLM Vision

## Current State (Hackathon MVP)

```
SerpApi Discovery → Candidates → Official Sources → AI Extraction → Facts → Economics
```

**What it does now:**
- Discovers LLM pricing changes via SerpApi
- Verifies against official sources
- Calculates economic value (MiMo 6×, Kimi 10.5×)
- Detects promotions (GLM-5.3-Flash 2× usage)
- Outputs MD/MCP for agents

---

## Vision 1: Cost Oracle for Agent Economics

**The hard problem LiveLLM should solve:**

> "This worker has $6.00 total economic capital for this job; it has already burned $1.84 on models, $0.21 on search, $0.08 on external agent services, has $3.87 remaining, is now projected to finish at $5.22, and should switch models because expected incremental value no longer justifies the expensive one."

**Four different costs:**

| Cost Type | What It Is | Who Provides It |
|-----------|------------|-----------------|
| List cost | Provider's published price | LiveLLM discovers |
| Estimated cost | tokens × rate | Cloudflare/LiteLLM |
| Provider-reported cost | Actual charge | OpenRouter usage API |
| Reconciled economic cost | What worker really consumed | LiveLLM calculates |

**Seven components:**

1. **Price Registry** — what you already have + temporal pricing
2. **Usage Ledger** — every invocation emits cost events
3. **Provider Adapters** — normalize OpenRouter/OpenAI/Anthropic/etc
4. **Credit Inventory** — what resources do I already own?
5. **Rate-limit Telemetry** — price without availability is useless
6. **Quality-by-Task** — cost per accepted outcome, not per token
7. **Cost Forecasting** — predict before spending

---

## Vision 2: LiveLLM as Moltwork's Economic Layer

```
                  LIVELLM

      MARKET TRUTH            OBSERVABLE TRUTH
           │                       │
Published prices              actual requests
free tiers                    actual tokens
subscriptions                 actual charges
credits                       actual latency
rate limits                   actual failures
quotas                        actual cache hits
promotions                    actual throttling
           │                       │
           └──────────┬────────────┘
                      │
                      ▼
              ECONOMIC SNAPSHOT
                      │
                      ▼
                 WORKERKIT
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
        continue    reroute     abort
```

**Key insight:** Virtuals solved transaction budgets. Moltwork needs agent economics.

---

## Vision 3: LiveLLM as Market Telemetry

**Not just "what's cheapest" but:**

```
WHAT DOES IT COST NOW?        → market intelligence
WHAT DID I ACTUALLY SPEND?    → telemetry + reconciliation
WHAT SHOULD I USE NEXT?       → economic routing
```

**Events to detect:**

- `PRICE_CHANGE` — list price changed
- `PROMOTION_STARTED` — new discount/multiplier
- `PROMOTION_EXPIRING` — ends Sept 9
- `MODEL_SERVICE_DEGRADATION` — latency spike, error increase
- `QUALITY_REGRESSION` — success rate dropped
- `RATE_LIMIT_CHANGE` — limits tightened
- `FREE_TIER_CHANGE` — free quota changed
- `MODEL_ALIAS_CHANGE` — model renamed/deprecated

---

## Vision 4: Hierarchical Budgets

```
Lab monthly budget: $500
├── Worker A: $100
├── Worker B: $200
│   ├── Opportunity 81: $4
│   │   ├── Planning: $0.30
│   │   ├── Execution: $2.80
│   │   ├── Verification: $0.50
│   │   └── Reserve: $0.40
│   └── Opportunity 92: $7
└── Worker C: $100
```

**Reserves are critical:**

```
$1.00 WorkOrder budget
├── $0.15 immutable submission reserve
├── $0.10 verification reserve
└── $0.75 discretionary execution budget
```

---

## Vision 5: Opportunity-Cost Accounting

```
Worker has:
  Frontier model: $10 credits remaining
  Cheap model: $100 credits remaining

LiveLLM provides:
  cash_cost
  marginal_cost
  scarcity_cost

WorkerKit assigns shadow price to scarce resources.
```

**The expensive model is nominally free right now, but its remaining quota is scarce. Preserve it for tasks where quality uplift matters.**

---

## Vision 6: Counterfactual Analysis

After a run:

```
Actual:
  model A, cost $0.84, success

Could model B have done this for $0.29?

Potential saving: $314/month
Confidence: 82%
Recommendation: route task_class X from A → B
```

---

## Vision 7: Cost Per Accepted Outcome

**The conceptual upgrade:**

```
Current:  cost per million tokens
Upgrade:  cost per accepted outcome
```

```
model X
task_class: coding.debug → success 91%
task_class: research.source-verification → success 74%
task_class: customer-support.policy → success 96%

worker_81 + process customer-support@v14 + model X = 97.2%
```

**The economic router optimizes expected outcome, not tokens.**

---

## Hackathon Scope (What to Build Now)

**Focus: SerpApi integration that demonstrates market intelligence**

1. ✅ Price discovery via SerpApi
2. ✅ Official source verification
3. ✅ Economics simulation (MiMo 6×, Kimi 10.5×)
4. ✅ Promotion detection (GLM-5.3-Flash 2×)
5. ✅ Cross-provider price comparison
6. ✅ MCP tools for agents
7. ✅ MD payload for agents

**Not in scope (future work):**

- Usage ledger (needs provider API integration)
- Credit inventory (needs auth tokens)
- Rate-limit telemetry (needs sustained monitoring)
- Quality-by-task (needs outcome data)
- Cost forecasting (needs historical data)
- Hierarchical budgets (needs WorkerKit integration)

---

## Alternative Versions

### Version A: Price Tracker (Simplest)
- Just discover and display prices
- No verification, no economics
- "What's the cheapest LLM?"

### Version B: Verified Price Feed (Current)
- SerpApi discovery + official source verification
- Economics simulation
- "What's the cheapest LLM and can we prove it?"

### Version C: Agent Cost Oracle (Hackathon Goal)
- Add usage tracking
- Add credit inventory
- "What should this agent use and why?"

### Version D: Full Economic Telemetry (Future)
- All seven components
- Hierarchical budgets
- Counterfactual analysis
- "Can this worker afford to do this work?"

---

## The Product Statement

**Today:** "The live truth and market-intelligence layer for AI."

**Better:** "LiveLLM is the economic telemetry layer for AI compute."

**Three questions:**
1. What does it cost now? → market intelligence
2. What did I actually spend? → telemetry + reconciliation
3. What should I use next? → economic routing

---

## Key Insight from WorkerKit

WorkerKit proves what happened. LiveLLM predicts what things cost.

```
LiveLLM = measurement + prediction
WorkerKit = economic policy + decision
```

They're complementary, not competing.

---

## Last Updated

August 30, 2026
