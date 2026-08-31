# LiveLLM — Full Pitch & Demo Script

**DevNetwork API + Cloud + AI Hackathon 2026**
**Time: 3 minutes + 2 minutes Q&A**

---

## SLIDE 1: Title (10 sec)

**LiveLLM — Verified Economic Intelligence for Autonomous Agents**

> "Budget-aware agents are emerging, but today there is no canonical representation of what their actions actually cost. We built that."

---

## SLIDE 2: The Problem (30 sec)

> "Agents are becoming budget-aware. Google's BATS and CATS research shows that budget-aware planning improves cost-performance. But there's a missing layer: what do actions actually cost right now?"

Show the five pricing traps:

| Trap | Example |
|---|---|
| Subscription makes "price" meaningless | MiMo: $0.14/M base, $0.023/M on Go |
| Tool pricing is multidimensional | Tavily: 1 credit × plan × remaining allocation |
| Coding subscriptions are everywhere | Cursor, Copilot, Go — all different economics |
| GPU compute changes weekly | Runpod cut prices 4 days ago |
| Official surfaces disagree | OpenCode /go vs /docs/go show different Hy3 numbers |

> "The advertised price is never the actual decision-relevant economic state."

---

## SLIDE 3: The Solution (20 sec)

Show the architecture:

```
SerpApi Discovery → Official Source → AI Extraction → Deterministic Validation → Fact Ledger → /v1/market
```

> "LiveLLM discovers pricing changes via SerpApi, validates them against official sources, and serves verified economic state with provenance. Not a pricing table — a fact ledger."

---

## SLIDE 4: The Demo — OpenCode Go Pricing Trap (60 sec)

> "Let me show you why this matters. What does MiMo V2.5 cost on OpenCode Go?"

**Step 1: The naive answer**
```
MiMo: $0.14/M    GLM-5.3-Flash: $0.075/M
→ "GLM is cheaper"
```

**Step 2: The subscription-aware answer**
```
MiMo: $60 included / $10 fee = 6× → $0.0233/M
GLM:  $15 included / $10 fee = 1.5× → $0.10/M
→ "MiMo is 4.3× cheaper"
```

**Step 3: The promotion**
```
GLM has a 2× usage promo right now
GLM amortized: $0.10 / 2 = $0.05/M
MiMo: $0.0233/M
→ "MiMo is still 2.14× cheaper"
```

**Step 4: The reconciliation proof**
```
We reproduce OpenCode's published request limits:
MiMo: 150,376 calculated ≈ 150,400 published (0.02% error)
GLM:  7,895 calculated ≈ 7,900 published (0.07% error)
```

> "A static pricing table gets this wrong. An LLM comparing prices gets this wrong. LiveLLM gets it right."

---

## SLIDE 5: The Conflict (30 sec)

> "But here's what's really interesting. Even OpenCode's own official surfaces disagree."

Show:
```
/docs/go/ baseline:  Hy3 = 4,300 requests/5h
English /go page:    Hy3 = 5,400 requests/5h
                     GLM = 3,200 with "2× usage" banner
```

> "Two official OpenCode pages show different numbers for Hy3. One surface says 4,300. The other says 5,400. An agent scraping the wrong surface gets the wrong answer. LiveLLM flags the conflict instead of silently choosing."

Show the routing output:
```json
{
  "model": "hy3",
  "subscription": { "base_value_multiple": 6.0 },
  "verification_state": "conflicting_official_sources"
}
```

---

## SLIDE 6: The x402 Purchase Flow (30 sec)

> "Here's the business model. Every payload is purchasable via x402 micropayment."

```
Agent needs economic state
    ↓
GET /v1/market?models=miMo-v2.5
    ↓
x402 402 Payment Required
    ↓
Agent pays $0.001
    ↓
Receives verified payload with provenance
    ↓
Uses in routing decision
```

> "Why would an agent pay $0.001 per query? Because the alternative is getting pricing wrong and wasting $5 on a bad model choice. The ROI is 5,000×."

Show the daily ritual:
```
Every morning:
  Agent checks LiveLLM → current economic state
  Routes tasks to optimal models/tools
  Saves 30-60% vs static pricing assumptions
  Pays $0.001 for the privilege
```

---

## SLIDE 7: The Routing Demo (20 sec)

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

## SLIDE 8: What's Next (20 sec)

Show the expansion sequence:

```
1. LLM/model economics  ← you are here
2. GPU/compute          ← next
3. agent tool-call economics
4. coding-agent subscriptions
5. x402 paid APIs
```

> "We started with LLM pricing because OpenCode Go exposed the problem. But the same pattern appears everywhere: Cursor, GitHub Copilot, Tavily, Exa, Firecrawl, Runpod, Vast. The advertised price is never the actual decision-relevant economic state."

---

## SLIDE 9: The Close (10 sec)

> "LiveLLM is the verified economic state layer for autonomous agents. We discover via SerpApi, validate against official sources, and serve provenance-backed facts. The math works — we reproduce OpenCode's own published numbers. Autonomous agents need this. We built it."

---

## Q&A Preparation

### "How is this different from CloudPrice?"
CloudPrice is a FinOps tool for cloud infrastructure. LiveLLM is designed for autonomous agents — temporal facts, provenance, conflict detection, x402 micropayments. We can eventually consume CloudPrice data.

### "Does the SerpApi integration actually work?"
Yes. The radar pipeline checks the SerpApi Account API before spending searches, enforces a reserve, records search_metadata.id, deduplicates discoveries. We use Google Light, Google News Light, and Search Index with JSON Restrictor.

### "What's the business model?"
x402 micropayments. Agents pay $0.001 per query. Revenue funds SerpApi credits + infrastructure. More agents = more verification capacity.

### "What about the Hy3 conflict?"
We flag it as conflicting_official_sources. LiveLLM doesn't silently choose between disagreeing official surfaces. The agent gets the conflict with provenance and can decide.

### "How many models?"
22 models across 8 providers. Every fact has a provenance chain. We verify against official sources, not scraped data.

### "Is the reconciliation actually correct?"
Yes. We independently compute request costs from token tariffs, calculate window allowances from plan limits, and reproduce OpenCode's published 150,400 MiMo requests/month (0.02% error) and 7,900 GLM requests/month (0.07% error).

---

## Timing Summary

| Section | Duration | Cumulative |
|---|---|---|
| Title | 10s | 0:10 |
| Problem | 30s | 0:40 |
| Solution | 20s | 1:00 |
| Demo: OpenCode Go trap | 60s | 2:00 |
| Conflict | 30s | 2:30 |
| x402 purchase | 30s | 3:00 |
| Routing demo | 20s | 3:20 |
| What's next | 20s | 3:40 |
| Close | 10s | 3:50 |

Total: ~3:50 (under 4 min with transitions)

---

## Visual Assets Needed

1. Side-by-side: English /go page vs /docs/go/ baseline (Hy3 5,400 vs 4,300)
2. The6-step pricing escalation (MiMo → subscription → promo → amortized)
3. Reconciliation proof (calculated vs published request limits)
4. Architecture diagram (SerpApi → Source → Extraction → Validation → Ledger → API)
5. x402 purchase flow diagram
6. Router output JSON with stale_comparison
7. Expansion sequence slide
