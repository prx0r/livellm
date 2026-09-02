# LiveLLM — Hackathon Winning Patterns Review

**Date:** 2026-09-02
**Context:** Review against Devpost winning patterns for hackathon refinement.

---

## Scorecard vs winning patterns

| Pattern | LiveLLM has it? | Score | Notes |
|---------|-----------------|-------|-------|
| **Magic transition** | Partial | 5/10 | "Stale price → live price → route changes" is conceptually magic but not visually demonstrated. |
| **Action, not answer** | Partial | 5/10 | The agent changes routing, but the demo doesn't show it happening live. |
| **Before/after** | Yes (conceptually) | 7/10 | "Before: $1.82. After: $0.61" is a strong before/after. Needs to be the demo centerpiece. |
| **Sponsor causally necessary** | Yes | 9/10 | SerpApi provides the fresh fact that changes the decision. Without it, stale pricing wins. |
| **Looks like a product** | Partial | 5/10 | Has API, but no visual demo. Judge can't "try it." |
| **One-sentence problem** | Yes | 8/10 | "Agents use stale pricing. We verify live." |
| **Human proof** | Partial | 5/10 | The concept is clear but the visual is weak (JSON, numbers). |
| **Sponsor proof** | Yes | 8/10 | SerpApi search → extracted fact → validated state. |
| **Engineering proof** | Yes | 8/10 | Receipts, provenance, temporal validation. |

**Overall: 6.4/10** — Strong concept, needs visual transformation.

---

## The one sentence (for Devpost)

> "It's the one where an agent's economic routing changes because they built a live, verifiable market-state layer instead of trusting stale pricing."

## Refinement plan

### P0: Make it visual

The current demo is backend-heavy. Add a simple web UI showing:

```
AGENT TASK: "Run 2M tokens of code generation"

CURRENT ASSUMPTION          LIVE VERIFIED MARKET
Provider A: $1.82/token     SerpApi → official source
                           Provider B: $0.61/token

ROUTE CHANGED: saving $2.42 per 1M tokens
```

### P1: Before/after must be the centerpiece

Don't show architecture first. Show the number changing.

### P2: SerpApi trace panel

Show each SerpApi call with latency, status, extracted fact.
