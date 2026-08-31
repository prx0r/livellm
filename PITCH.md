# LiveLLM — Extended Pitch & Demo

**DevNetwork API + Cloud + AI Hackathon 2026**
**Duration: 4 minutes + 2 minutes Q&A**

---

## SLIDE 1: Opening (15 sec)

**LiveLLM — Verified Economic Intelligence for Autonomous Agents**

> "Budget-aware agents are emerging. Google's BATS and CATS research shows that budget-aware planning improves the cost-performance frontier. But there's a missing layer: what do actions actually cost right now?"

Show the agent reasoning trace:

```
GOAL: Earn > $20 from this task
KNOWN CAPABILITIES: P(success | coding task) = 0.71
BUDGET: $5.00 remaining
```

> "The planning algorithm can be mathematically excellent and still make the wrong economic decision because the inputs are stale. That's the problem we solve."

---

## SLIDE 2: The Five Pricing Traps (60 sec)

> "This isn't an edge case. It's everywhere. Here are five pricing traps that break autonomous agents."

**Trap 1: Subscriptions make "price" meaningless**

```
MiMo V2.5:   $0.14/M base  →  $0.023/M on Go (6× subscription value)
GLM-5.3-Flash: $0.15/M base  →  $0.10/M on Go (1.5×)  →  $0.05/M with 2× promo
```

> "The same model has list price, amortized price, and promo-adjusted price. A static table gives you one number. That number is wrong."

**Trap 2: Tool pricing is multidimensional**

```
Tavily: 1 credit × plan × remaining allocation
Exa: $0.012 to $1/run depending on depth, reasoning, enrichment
Firecrawl: credits/page × subscription tier × rollover rules × overage
```

> "An agent deciding 'Tavily vs Exa vs Firecrawl?' needs a cost function, not a price."

**Trap 3: Coding subscriptions are the same everywhere**

```
Cursor: $20/$60/$200, two usage pools, model-specific tariffs, 10% regional uplift
GitHub Copilot: AI credits, 50% off GPT-5.6 Sol through Sept 3
OpenCode Go: $10/mo, 6× for MiMo, 1.5× for GLM, 2× promo
```

> "I pay for Cursor Pro and OpenCode Go. For this job, which subscription's remaining capacity should I consume first? Nobody can answer that."

**Trap 4: GPU compute changes weekly**

```
Runpod cut prices 4 days ago (August 27)
Vast: on-demand / reserved / interruptible — market price, not catalog
Modal: GPU-second + $30/mo free on starter
```

> "The agent's GPU cost assumption was stale within a week."

**Trap 5: Official surfaces disagree with themselves**

```
OpenCode /docs/go/:  Hy3 = 4,300 requests/5h
OpenCode /go page:   Hy3 = 5,400 requests/5h
```

> "Two official OpenCode pages show different numbers for the same model. An agent scraping the wrong surface gets the wrong answer."

---

## SLIDE 3: The Pattern (20 sec)

> "These aren't five separate problems. They're the same problem in five domains."

Show the table:

```
                    LLM             Compute         Tools
                    ─────────────   ─────────────   ─────────────
nominal≠effective   Go subs         reserved GPU    monthly credits
time-dependent      peak/off-peak   spot market     promotions
route-dependent     Z.ai vs OC      host/region     API plan
state-dependent     quota left      credits left    credits left
composite billing   cache/in/out    compute+storage search+pages
availability        model enabled   GPU rentable    rate limits
temporary promos    GLM 2×          price cuts      free credits
commitment effects  subscription    reserved term   monthly plan
rounding            token units     seconds         request buckets
source disagreement OC locales      API vs landing  docs vs pricing
```

> "That commonality is evidence that we're finding an actual primitive, not randomly adding markets."

---

## SLIDE 4: The Solution (20 sec)

> "LiveLLM is the verified economic state layer for autonomous agents."

Show the architecture:

```
SerpApi Discovery → Official Source → AI Extraction → Deterministic Validation → Fact Ledger → GET /v1/market
```

> "We discover pricing changes via SerpApi, validate them against official sources, and serve provenance-backed economic state. Not a pricing table. A fact ledger."

---

## SLIDE 5: The Demo — OpenCode Go Pricing Trap (60 sec)

> "Let me show you why this matters. What does MiMo V2.5 cost on OpenCode Go?"

**Step 1: The naive answer**

```
MiMo: $0.14/M    GLM-5.3-Flash: $0.075/M
→ "GLM is cheaper"
```

**Step 2: The subscription-aware answer**

```
MiMo: $60 included / $10 fee = 6×  →  $0.0233/M
GLM:  $15 included / $10 fee = 1.5×  →  $0.10/M
→ "MiMo is 4.3× cheaper"
```

**Step 3: The promotion**

```
GLM has a 2× usage promo right now
GLM amortized: $0.10 / 2 = $0.05/M
MiMo: $0.0233/M
→ "MiMo is still 2.14× cheaper"
```

> "A static pricing table gets this wrong. An LLM comparing prices gets this wrong. LiveLLM gets it right."

---

## SLIDE 6: The Proof (30 sec)

> "We can prove our interpretation is correct."

Show the reconciliation:

```
We independently compute request costs from token tariffs,
calculate window allowances from plan limits, and reproduce
OpenCode's own published request limits:

MiMo: calculated 150,376 ≈ published 150,400 (0.02% error)
GLM:  calculated 7,895 ≈ published 7,900 (0.07% error)
```

> "Our math matches OpenCode's numbers. The interpretation of their awkward subscription economics is correct."

Show the conflict:

```
/docs/go/ baseline:  Hy3 = 4,300 requests/5h
/go page:            Hy3 = 5,400 requests/5h

verification_state: "conflicting_official_sources"
```

> "LiveLLM doesn't guess when official surfaces disagree. It emits the conflict with provenance."

---

## SLIDE 7: The x402 Business Model (20 sec)

> "Here's the business model. Every payload is purchasable via x402 micropayment."

```
Agent needs economic state
    ↓
GET /v1/market
    ↓
x402 402 Payment Required ($0.001)
    ↓
Agent pays, receives verified payload
    ↓
Uses in routing decision
    ↓
Saves $5 on bad model choice
    ↓
ROI: 5,000×
```

> "Why pay $0.001 per query? Because the alternative is getting pricing wrong and wasting $5 on a bad model choice."

---

## SLIDE 8: The Daily Ritual (15 sec)

> "This becomes a daily ritual for agents."

```
Every morning:
  Agent checks LiveLLM → current economic state
  Routes tasks to optimal models/tools
  Saves 30-60% vs static pricing assumptions
  Pays $0.001 for the privilege

Every hour:
  SerpApi detects changes
  Fact ledger updates
  Agent re-checks if task is long
```

> "Just as humans check market prices before financial decisions, agents check LiveLLM before economic decisions."

---

## SLIDE 9: The Routing Demo (15 sec)

Show the MWGym router output:

```json
{
  "task": "write a Python script",
  "model": "MiMo V2.5",
  "amortized_cost": "$0.0233/M",
  "subscription": { "base_value_multiple": 6.0 },
  "promotion": null,
  "verification_state": "reconciled",
  "stale_comparison": {
    "without_livellm": "GLM-5.3-Flash",
    "with_livellm": "MiMo V2.5",
    "reason": "MiMo is 2.14× cheaper with 8× more context"
  }
}
```

> "Without LiveLLM, the router picks GLM. With LiveLLM, it picks MiMo. Same task, better economics, verified provenance."

---

## SLIDE 10: What's Next (20 sec)

> "We started with LLM pricing because OpenCode Go exposed the problem. But the same pattern appears everywhere."

Show the expansion sequence:

```
1. LLM/model economics    ← you are here
2. GPU/compute            ← next (Runpod, Vast, Modal)
3. agent tool-call economics  ← Tavily, Exa, Firecrawl, Browserbase
4. coding-agent subscriptions ← Cursor, Copilot, Go
5. x402 paid APIs
6. generic cloud
```

> "Compute proves the abstraction generalizes. Tool-call economics proves why autonomous agents actually need it."

---

## SLIDE 11: The Close (10 sec)

> "LiveLLM is the verified economic state layer for autonomous agents. We discover via SerpApi, validate against official sources, and serve provenance-backed facts. The math works — we reproduce OpenCode's own published numbers. The advertised price is never the actual decision-relevant economic state. We built the layer that is."

---

## SERPAPI INTEGRATION (mention if asked)

Deep integration, not surface-level:

| Feature | How We Use It |
|---|---|
| News Light | Detect provider announcements (price changes, new models) |
| Google Light | Verify pricing pages, organic results + related questions |
| Search Index Deep | Discover new providers, unknown unknowns |
| JSON Restrictor | Strip discovery responses to only fields the pipeline needs |
| Search Archive IDs | Persist as provenance handles for every observation |
| Account API | Quota governance — check before spending, enforce reserve |
| `nfpr=1` | Suppress autocorrect for obscure model names (MiMo, GLM-5) |
| `filter=0` | Increase recall, deduplicate ourselves |

> "Search is not just another source. It's the change-detection mechanism."

---

## TECH STACK

```
TypeScript + Node.js
SQLite (bitemporal fact ledger)
SerpApi (change detection + source discovery)
AI extraction (MiMo V2.5)
Deterministic validation
MCP server (5 read-only tools)
9 HTTP API endpoints
77 passing tests
```

---

## API ENDPOINTS

| Endpoint | Description |
|---|---|
| `GET /v1/market` | Full market snapshot (22 models, 23 routes) |
| `GET /v1/market?models=X` | Filter to specific models |
| `GET /v1/market/gpu` | GPU compute pricing (experimental) |
| `GET /v1/models/:model` | Detailed model facts with evidence |
| `GET /v1/economics/:model` | Cost-per-1K for agents |
| `GET /v1/changes` | Recent market changes |
| `GET /v1/evidence/:id` | Full provenance bundle |
| `GET /v1/ingestion/sources` | External sources + verification status |
| `GET /v1/x402/pricing` | Per-query pricing for agents |

---

## Q&A PREPARATION

### "How is this different from CloudPrice?"
CloudPrice is a FinOps tool for cloud infrastructure. LiveLLM is designed for autonomous agents — temporal facts, provenance, conflict detection, x402 micropayments. These projects demonstrate that machine-readable economic data is becoming infrastructure. LiveLLM adds a fact-level verification layer.

### "Does the SerpApi integration actually work?"
Yes. The radar pipeline checks the SerpApi Account API before spending searches, enforces a reserve, records search_metadata.id, deduplicates discoveries. We use Google Light, Google News Light, and Search Index with JSON Restrictor.

### "What's the business model?"
x402 micropayments. Agents pay $0.001 per query. Revenue funds SerpApi credits + infrastructure. More agents = more verification capacity. The endpoint improves as it scales.

### "What about the Hy3 conflict?"
We flag it as conflicting_official_sources. /docs/go/ says 4,300, /go page says 5,400. LiveLLM doesn't silently choose between disagreeing official surfaces. The agent gets the conflict with provenance.

### "How many models?"
22 models across 8 providers. Every fact has a provenance chain. We verify against official sources, not scraped data.

### "Is the reconciliation actually correct?"
Yes. We independently compute request costs from token tariffs, calculate window allowances from plan limits, and reproduce OpenCode's published 150,400 MiMo requests/month (0.02% error) and 7,900 GLM requests/month (0.07% error).

### "What's next after LLM pricing?"
GPU/compute (Runpod, Vast, Modal), then tool-call economics (Tavily, Exa, Firecrawl, Browserbase). The same pricing complexity appears in every domain autonomous agents touch.

### "Why x402?"
The 402 Payment Required response itself communicates what an API costs. Agent can inspect before paying. Eventually LiveLLM normalizes x402 responses into economic quotes. The observation is itself machine-verifiable.

---

## TIMING SUMMARY

| Section | Duration | Cumulative |
|---|---|---|
| Opening | 15s | 0:15 |
| Five Pricing Traps | 60s | 1:15 |
| The Pattern | 20s | 1:35 |
| The Solution | 20s | 1:55 |
| Demo: OpenCode Go Trap | 60s | 2:55 |
| The Proof | 30s | 3:25 |
| x402 Business Model | 20s | 3:45 |
| Daily Ritual | 15s | 4:00 |
| Routing Demo | 15s | 4:15 |
| What's Next | 20s | 4:35 |
| Close | 10s | 4:45 |

Total: ~4:45 (under 5 min with transitions)

---

## VISUAL ASSETS NEEDED

1. **Agent reasoning trace** — stale budget assumptions
2. **Five pricing traps** — side-by-side escalation
3. **The pattern table** — 10 rows × 3 domains
4. **Architecture diagram** — SerpApi → Source → Extraction → Validation → Ledger → API
5. **6-step pricing escalation** — MiMo subscription → amortized → promo
6. **Reconciliation proof** — calculated vs published request limits
7. **Conflict screenshot** — /docs/go/ vs /go page for Hy3
8. **x402 purchase flow** — 402 → pay → receive → use
9. **Router JSON output** — stale_comparison showing decision change
10. **Expansion sequence** — 6 domains with arrows
11. **Competitive landscape** — AgentDeals, CloudPrice, etc. positioning

---

## SUBMISSION

**Hackathon:** DevNetwork API + Cloud + AI 2026
**Category:** Track 2 — SerpApi Integration
**Repo:** github.com/prx0r/livellm
**Deadline:** September 3, 2026 at 10:00 AM PDT
