# REF: OpenCode Go Pricing Complexity — LiveLLM Demo Reference

**Date:** August 31, 2026
**Source:** Verified against opencode.ai/docs/go/, opencode.ai/go, localized /go pages

---

## The Problem

Ask an LLM: "What is the cheapest model on OpenCode Go?"

It looks like a simple pricing-table question. It isn't.

OpenCode Go has several independent layers of economic state:

- a $10 subscription
- model-specific token tariffs
- model-specific included usage
- rolling 5-hour, weekly, and monthly limits
- temporary model-specific promotions
- peak/off-peak pricing for some models
- fallback PAYG economics after subscription quota is exhausted

---

## Verified Go Plan Economics

**Source:** opencode.ai/docs/go/

- Subscription: $10/month
- Rolling limits: $12/5h, $30/week, $60/month

### Model-Specific Tariffs

| Model | Input/1M | Output/1M | Cached/1M | Model Usage | Base Mult | Typical Request | Published 5h | Published Week | Published Month |
|---|---|---|---|---|---|---|---|---|---|
| MiMo V2.5 | $0.14 | $0.28 | $0.0028 | $60 | **6×** | 830 in, 71500 cached, 295 out | 30,100 | 75,200 | 150,400 |
| GLM-5.3-Flash | $0.15 | $0.50 | $0.03 | $15 | **1.5×** | 1000 in, 55000 cached, 200 out | 1,580 | 3,950 | 7,900 |
| DeepSeek V4 Flash | $0.22 | $0.66 | $0.007 | $30 | **3×** | 410 in, 71300 cached, 310 out | 11,400 | 28,600 | 57,200 |
| Hy3 | $0.14 | $0.58 | $0.035 | $60 | **6×** | 1000 in, 55000 cached, 200 out | 5,400 | 13,500 | 27,000 |

### DeepSeek Peak/Off-Peak

- Peak: 01:00-04:00 and 06:00-10:00 UTC, Mon-Fri
- Peak prices: $0.44/1M in, $1.32/1M out (double off-peak)

### Reconciliation Proof

Our math reproduces OpenCode's published request limits:

```python
request_cost = (input × input_rate + cached × cached_rate + output × output_rate) / 1M
allowance = (plan_limit × model_usage) / plan_monthly
expected = allowance / request_cost
```

**MiMo:** $60 / ($0.000399/request) = 150,376 ≈ 150,400 ✓ (0.02% error)
**GLM:** $15 / ($0.0019/request) = 7,895 ≈ 7,900 ✓ (0.07% error)

---

## Promotions (Temporal Facts)

### GLM-5.3-Flash: 2× Usage

**Source:** opencode.ai/go (canonical English page)

- Banner: "GLM-5.3-Flash gets 2× usage limits for a limited time"
- English chart: still shows 1,580 (stale)
- Localized pages: show 3,160 with "2x usage"
- Math: 1,580 × 2 = 3,160 ✓
- **Verification state:** VERIFIED / RECONCILED

### Hy3 Inconsistency (VERIFIED)

**Source:** English official surfaces disagree

- `/docs/go/` baseline: Hy3 = 4,300 requests/5h
- English `/go` page: Hy3 = 5,400 requests/5h (no promo label shown)
- **This is a real inconsistency between two official English surfaces**
- **Verification state:** CONFLICTING_OFFICIAL_SOURCES

Note: The earlier claim of "8× usage on localized pages" could not be verified (localized pages returned 404). The confirmed conflict is between the two English surfaces.

**Important:** Do NOT emit Hy3 8× as unquestioned truth until English canonical surface confirms it. Emit the conflict.

---

## Official Source Inconsistency (Demo Gold)

Even OpenCode's own official surfaces are not perfectly synchronized:

| Surface | GLM 5h | GLM Promo | Hy3 5h | Hy3 Promo |
|---|---|---|---|---|
| English /go chart | 1,580 | "2× usage" banner | 5,400 | none shown |
| Localized /go pages | 3,160 | "2× usage" | 43,200 | "8× usage" |
| /docs/go/ baseline | 1,580 | none | 5,400 | none |

This is the demo: "Our crawler discovered conflicts between official surfaces. LiveLLM refuses to silently choose. It emits the conflict with provenance."

---

## Architecture: Two Completely Different Primitives

### 1. SubscriptionEconomics (permanent plan facts)

```python
@dataclass
class SubscriptionEconomics:
    provider: str
    plan: str
    model_id: str
    subscription_fee_usd: float
    included_usage_usd: float
    base_value_multiple: float  # DERIVED: included / fee
    evidence_id: str
    observed_at: str
```

### 2. UsagePromotion (temporal facts)

```python
@dataclass
class UsagePromotion:
    provider: str
    plan: str
    model_id: str
    promotion_type: str  # "usage_limit_multiplier"
    multiplier: float
    scope: list[str]  # ["5h"], ["5h", "week", "month"], or ["unknown"]
    valid_from: str | None
    valid_to: str | None
    discovered_at: str
    evidence_id: str
    verification_state: str  # "candidate", "verified", "reconciled", "conflicting_official_sources"
```

### Never do this

```python
SUBSCRIPTION_PLANS[("opencode-go", "glm")] = {"multiplier": 3}
```

This destroys the distinction between permanent plan economics and temporary promotional state.

### Always do this

```python
base_value_multiple = included_usage_usd / subscription_fee_usd
current_requests_5h = baseline_requests_5h * active_promo_multiplier
```

---

## Verification States

```python
class VerificationState(Enum):
    CANDIDATE = "candidate"
    VERIFIED = "verified"
    RECONCILED = "reconciled"
    CONFLICTING_OFFICIAL_SOURCES = "conflicting_official_sources"
    EXPIRED = "expired"
```

---

## Routing Output Format

```json
{
  "model": "glm-5.3-flash",
  "subscription": {
    "monthly_fee_usd": 10,
    "included_usage_usd": 15,
    "base_value_multiple": 1.5
  },
  "promotion": {
    "type": "usage_limit_multiplier",
    "multiplier": 2,
    "scope": ["5h"],
    "temporary": true,
    "verification_state": "reconciled"
  }
}
```

---

## Four Source Classes

| Source | Authority | Purpose |
|---|---|---|
| opencode.ai/docs/go/ | baseline truth | plan limits, token prices, usage column, workloads, baseline request counts |
| opencode.ai/go | promo truth | banners, 2× usage, 8× usage, current promotional request chart |
| Localized /go alternates | corroboration/conflict detection | catch deployment/cache differences |
| /zen/go/v1/models | inventory truth | model IDs currently available |

---

## Promotion Expiration Rules

- At discovery: `valid_from = first_observed_at`, `valid_to = None`, `status = "active_observed"`
- If missing: `status = "possibly_expired"`
- Require two consecutive fresh fetches showing baseline restored before closing:
  `valid_to = last_observed_active_at`, `status = "expired"`

---

## Generic Promo Parser

```python
PROMO_RE = re.compile(
    r"(?P<multiplier>\d+(?:\.\d+)?)\s*[x×]\s*(?:usage(?:\s+limits?)?|limits?)",
    re.IGNORECASE,
)
```

Must associate promo with nearest model card/DOM unit. Do NOT search whole page and guess.

---

## Source Observation Schema

```python
@dataclass
class SourceObservation:
    url: str
    fetched_at: str
    status: int
    etag: str | None
    last_modified: str | None
    cache_control: str | None
    age: str | None
    raw_sha256: str
    normalized_sha256: str
```

---

## Demo Narrative

1. "What does MiMo V2.5 cost on OpenCode Go?" — $0.14/M
2. "What does GLM-5.3-Flash cost?" — $0.15/M
3. "So GLM is cheaper?" — No. MiMo has $60 included usage (6×), GLM has $15 (1.5×). Amortized: MiMo $0.023/M, GLM $0.05/M.
4. "But GLM has a 2× promo?" — Yes. Effective: $0.025/M. MiMo is still 1.09× cheaper.
5. "Can you prove these numbers?" — Yes. Our reconciliation reproduces OpenCode's published 150,400 and 7,900 request limits from raw facts.
6. "What about Hy3?" — Our crawler found 8× on localized surfaces but not English canonical. LiveLLM emits the conflict rather than guessing.
7. "This is why agents need verified economic state."
