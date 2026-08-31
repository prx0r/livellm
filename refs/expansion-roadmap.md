# REF: LiveLLM Expansion Roadmap — Post-LLM Pricing

**Date:** August 31, 2026
**Status:** Strategic reference for post-hackathon development

---

## The Unifying Thesis

Every worthwhile LiveLLM domain has the same pathology:

> **The advertised price is not the actual decision-relevant economic state.**

LLMs were simply the first place we noticed the problem. OpenCode Go gave us the killer example. Compute proves the abstraction generalizes. Tool-call economics proves why autonomous agents actually need it.

---

## Expansion Sequence

**1. LLM/model economics** ← current (hackathon)
**2. GPU/compute** ← next
**3. agent tool-call economics** ← most important strategically
**4. coding-agent subscriptions/credits**
**5. x402 paid APIs** ← native quote market
**6. generic cloud** ← later (Infracost already specialized)

---

## The General LiveLLM Ontology

Stop thinking in terms of `LLMPrice`, `GPUPrice`, `ToolPrice`. Create one:

```python
@dataclass
class EconomicRoute:
    asset: str              # "tool:tavily/search", "gpu:h100", "llm:miMo-v2.5"
    provider: str
    tariff: dict            # pricing structure
    billing_function: dict  # how cost is computed
    commitments: dict       # reserved/prepaid
    included_capacity: dict # monthly allowances
    promotions: list        # temporal facts
    constraints: dict       # rate limits, concurrency
    availability: dict      # current state
    side_costs: dict        # storage, bandwidth, egress
    evidence: list          # provenance chain
    valid_from: str
    observed_at: str
```

Then user state:

```python
@dataclass
class EconomicPosition:
    route: str
    subscription: str
    sunk_monthly_fee: float
    remaining_credits: float
    reset_at: str
```

And the core function:

```python
def quote(action, route, position) -> dict:
    return {
        "cash_incremental": 0,
        "quota_consumed": 2,
        "amortized_cost": 0.0116,
        "opportunity_cost": "...",
        "verification_state": "verified",
    }
```

---

## Domain 2: GPU/Compute

### Why it's the best proof of generalization

A naive system stores: `H100 = $2.50/hour`

An agent actually needs:

```text
GPU = H100
provider = Vast
rental_type = interruptible
region = US
price = current bid
availability = rentable now
reliability = 0.98
storage = $X/GB
bandwidth = $Y/GB
min_duration = ...
max_duration = ...
interruption_risk = ...
observed_at = ...
```

### The parallel to OpenCode

| OpenCode | GPU market |
|---|---|
| token list price | GPU hourly list price |
| Go subscription | reserved/committed compute |
| temporary 2× promo | temporary compute discount |
| quota remaining | prepaid credits/capacity |
| model-specific usage | machine-specific pricing |
| peak/off-peak pricing | spot/bid pricing |
| model availability | GPU availability |
| provider route | host/region route |

### Three providers, three economic models

**Runpod** — Pods vs Serverless, Flex vs Active, per-second billing, GPU class, storage, availability, promotions

**Vast** — Individual offer ID, GPU, count, on-demand/reserved/interruptible, bid price, region, reliability, storage, bandwidth, max duration. Offers are actual market state, not static catalog.

**Modal** — GPU-second, CPU-second, memory-second, storage, $30/month free on starter plan.

### The demo

```text
SerpApi detects Runpod price cut
        ↓
official pricing page changes
        ↓
LiveLLM validates new tariff
        ↓
old fact closes
        ↓
new economic state emitted
        ↓
agent reconsider API inference vs GPU
```

---

## Domain 3: Agent Tool-Call Economics (most important strategically)

BATS/CATS isn't only about model tokens. Tool calls themselves consume the agent's budget. Yet tool pricing is becoming absurdly multidimensional.

### Tavily

```text
basic search        = 1 credit
advanced search     = 2 credits
basic extraction    = 1 credit / 5 successful URLs
advanced extraction = 2 credits / 5 successful URLs
map                 = credits based on pages
crawl               = map cost + extraction cost
Research mini       = 4–110 credits
Research pro        = 15–250 credits
```

Credit cash value changes by plan. Correct function:

```python
cost(endpoint="crawl", pages=57, extraction_depth="advanced",
     subscription="startup", remaining_free_credits=8400)
```

### Exa

Separate economics for: search, deep search, deep-reasoning search, contents, additional results, page summaries, monitors, agent compute units, agent search tool calls, email enrichment, phone enrichment. Agent API ranges $0.012–$1/run.

An autonomous research agent deciding "basic search vs deep search vs Exa research agent?" needs a **cost function**, not a price table.

### Firecrawl

Monthly included credit pools, differing subscription prices, different concurrency, scrape/crawl/search/interact = different credits/page or credits/result, overage pricing, credits that don't roll over.

Same distinction as OpenCode: list cost ≠ amortized cost ≠ marginal cash cost ≠ opportunity cost of quota.

### Browserbase

Browser hours + model tokens + search calls + fetch calls + extract calls + proxies per GB. Included volumes and overage rates differ by plan.

### The killer demo

> "Research 100 companies with web search + scrape + enrichment."

LiveLLM calculates:

```text
Model choice       $0.42
Search strategy    $0.70
Browser strategy   $0.31
Compute            $0.08
-------------------------
expected task cost $1.51
```

Instead of blindly assigning an agent $5.

---

## Domain 4: Coding-Agent Subscriptions

### OpenCode Go (current)

$10/month, model-specific tariffs, model-specific included usage, rolling limits, temporary promotions, peak/off-peak. Already demonstrated.

### Cursor

- $20/$60/$200 individual subscriptions
- Two separate usage pools
- Different first-party vs third-party model economics
- Model-specific token costs
- Fast variants with different tariffs
- On-demand fallback after included usage
- $0.25/M Cursor Token Rate on third-party models for Teams/Enterprise
- 10% regional-data-residency uplift
- Temporary legacy pricing until September 7, 2026

### GitHub Copilot

Converts model token usage into AI credits. Plan allowances vary. Temporary promotions including 50% off GPT-5.6 Sol through September 3, 2026.

### The question

> "I already pay for Cursor Pro and OpenCode Go. For this coding job, which subscription's remaining capacity should I consume first?"

---

## Domain 5: x402 Paid APIs (native quote market)

Not as crawler. As interface.

x402's `402 Payment Required` response communicates: amount, currency/asset, network, payment recipient, scheme. Agent can inspect what an API costs before paying.

```json
{
  "asset": "tool:web_search/provider-x",
  "quote": {
    "amount_usd": 0.007,
    "pricing_basis": "request",
    "request_shape": {...}
  },
  "payment": {
    "protocol": "x402",
    "scheme": "exact"
  },
  "observed_at": "...",
  "evidence": "live-402-response"
}
```

The economic observation is itself machine-verifiable. Instead of scraping "$0.01/request", the agent asks "what would this exact HTTP request cost?" and gets the seller's current payment requirement.

---

## Domain 6: Generic Cloud (postpone)

Huge complexity. Cloudflare R2 alone has GB-month storage, Class A/B operations, retrieval fees, free-tier applicability, billing-unit rounding, free egress. AWS worse.

The abstraction fits perfectly. But Infracost already specializes here. Consume Infracost/Spare Cores later instead of reproducing today.

---

## The Five Recurring Difficulties

Every worthwhile LiveLLM domain contains the same problems:

| Problem | LLM | Compute | Tools |
|---|---|---|---|
| nominal ≠ effective price | Go subscriptions | reserved GPU | monthly credits |
| time-dependent | DeepSeek peak/off-peak | spot market | promotions |
| route-dependent | Z.ai vs OpenCode | host/region | API plan |
| state-dependent | quota remaining | credits/capacity | credits remaining |
| composite billing | cache/input/output | compute+storage+bandwidth | search+pages+proxy |
| availability | model enabled | GPU rentable | concurrency/rate limits |
| temporary promos | GLM 2× | price cuts | free credits |
| commitment effects | subscription | reserved term | monthly plan |
| rounding/minimums | token units | seconds/min duration | request/page buckets |
| source disagreement | OpenCode locales | market/API vs landing page | docs vs pricing page |

That commonality is evidence that we're finding an actual primitive rather than randomly adding markets.

---

## Build Order

### v0.2 — Models (current hackathon)
Finish OpenCode reconciliation. GLM 2× / Hy3 8× / MiMo 6× as flagship demo.

### v0.3 — Compute
Only Runpod + Vast + Modal. Dynamic availability and actual total-cost functions, not 100 providers.

### v0.4 — Tools
Tavily, Exa, Firecrawl, Browserbase, SerpApi. One workload: "Research 100 companies." LiveLLM calculates economic routes.

### v0.5 — Coding Subscriptions
OpenCode Go, Cursor, GitHub Copilot. "Which subscription's remaining capacity should I consume?"

### v0.6 — x402
Normalize 402 responses into economic quotes. Machine-verifiable pricing.

### v1.0 — Generic Cloud
Consume Infracost/Spare Cores rather than reproducing.

---

## The Pitch

> **Budget-aware agents are emerging, but today there is no canonical representation of what their actions actually cost. LiveLLM turns fragmented, changing provider economics into verified executable cost functions.**

LLMs were simply the first place we noticed the problem.

OpenCode gave us the killer example.

**Compute proves the abstraction generalizes.**

**Tool-call economics proves why autonomous agents actually need it.**

---

## Sources

- Vast.ai pricing: https://docs.vast.ai/guides/instances/pricing
- Runpod pricing: https://www.runpod.io/pricing
- Modal pricing: https://modal.com/pricing
- Tavily credits: https://docs.tavily.com/documentation/api-credits
- Exa pricing: https://exa.ai/pricing
- Firecrawl pricing: https://www.firecrawl.dev/pricing
- Browserbase pricing: https://www.browserbase.com/pricing
- Cursor models/pricing: https://cursor.com/docs/models-and-pricing
- GitHub Copilot pricing: https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing
- x402 HTTP 402: https://docs.cdp.coinbase.com/x402/core-concepts/http-402
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
