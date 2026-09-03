# LiveLLM — NORTHSTAR PROMPT

## Assessment Criteria Alignment

**Progress:** Full pipeline live — SerpApi discovery → official source → AI extraction → 6-step validation → fact ledger → agent rerouting. 23 models, 9 providers, 46 fact fields. 76 tests passing. MCP server shipped.

**Concept:** Agents make economic decisions using stale market data. The math is correct, the state is wrong. This is a real, growing problem as AI agents spend billions on model inference.

**Feasibility:** Natural API product. Model routers, agent frameworks, inference gateways all need verified economics. x402 makes it machine-payable. The dataset compounds — every search adds value.

## Structure

1. Welcome + statistic (10s)
2. Problem (15s)
3. Solution thesis (15s)
4. Landing page scroll — pipeline + SerpApi (30s)
5. Demo — narrate as it runs (60s)
6. Post-demo: startup potential, moat, revenue (30s)
7. Close (10s)

## Shocking Statistic
"93% of Google searches now end without a click — AI Overviews answer directly. Meanwhile, agents are making billions of API calls daily using prices from their training data."

---

# LiveLLM — WORD4WORD SCRIPT

**Total: ~2:20 speaking time + demo pauses = ~2:45 recording**

---

## [LANDING PAGE — HERO]

Welcome to LiveLLM.

LiveLLM explores verified economic intelligence for autonomous AI agents — which has become a critically important topic as AI agents increasingly make autonomous spending decisions.

Here's the problem in one line:

**93% of Google searches now end without a click. AI Overviews answer directly. Meanwhile, agents are making billions of API calls daily — using prices from their training data.**

That means every model router, every coding agent, every inference gateway is making economic decisions based on last month's prices. The math is correct. The market state is wrong.

---

## [SCROLL TO PROBLEM SECTION]

Let me show you what I mean.

This agent needs to route 240 code reviews per day. Budget: fifty dollars a month. It looks at the available models and picks the cheapest one it knows about.

The problem is what it doesn't know. It doesn't know about subscription plans that make a model ten times cheaper. It doesn't know about temporary promotions. It doesn't know about free tiers that cover the entire workload.

The advertised price is never the actual decision-relevant economic state.

---

## [SCROLL TO HOW IT WORKS]

Here's how LiveLLM solves this.

We use SerpApi to discover changing model economics from the live web — not from training data, not from cached tables. Every search gives us a search ID for provenance.

We follow the result to the provider's official pricing page. We extract structured facts with AI. We validate them with six deterministic checks. And we serve the result through an API that agents can consume directly.

SerpApi is not decoration here. It is the discovery layer. Without it, LiveLLM is another stale pricing table.

---

## [SCROLL TO SERPAPI SECTION]

The key insight: SerpApi's markdown output format gives us a compact payload — fifty percent fewer tokens than JSON. Agents ingest this directly. No parsing, no transformation.

We use Google Light for official source resolution, Search Index Deep for unknown-source discovery, and the Account API for quota governance. Every observation carries the search ID as provenance.

---

## [CLICK TRY THE LIVE DEMO → /demo]

Let me show you.

*[Click Run Demo — narrate as logs stream]*

The agent starts with stale data — a pay-as-you-go price list from OpenRouter. It picks Z.ai GLM-5.3-Flash at roughly thirty-six dollars a month.

Now LiveLLM refreshes the market state. A live SerpApi search identifies the current official provider surface. We get a search ID — provenance attached to this specific discovery.

The agent reroutes. It discovers OpenCode Go MiMo V2.5 at ten dollars a month — a subscription that wasn't visible in the stale data. That's seventy-two percent cheaper, with eight times the context window.

*[Let the verdict sit on screen for three seconds]*

Same agent. Same workload. The route changed because the market state changed.

---

## [CLICK EVIDENCE]

And we can prove where every decision came from.

Every fact traces to a SerpApi search ID. A SHA-256 content hash. A source URL. A verification state. Old facts are superseded, never overwritten.

This isn't vibes. It's a provenance chain.

---

## [CLICK PAYLOAD → GENERATE PAYLOAD]

This is the machine-readable payload underneath the UI.

The first block is raw SerpApi markdown — the output-dot-md format, optimized for LLM consumption. The second block is our enriched payload with economics — cost per request, subscription multiples, effective monthly cost.

Twenty-three models across nine providers. Verified from official pricing pages.

---

## [CLOSE — scroll back to hero or stay on page]

Today LiveLLM tracks twenty-three models across nine providers. Three hundred and sixty-eight active facts.

The obvious customers are model routers like OpenRouter and LiteLLM. Agent frameworks like CrewAI and AutoGen. Inference gateways like Together and Fireworks. Every one of these systems makes this exact decision thousands of times a day.

One SerpApi search becomes reusable verified intelligence for thousands of downstream decisions.

The agent's math was correct. Its market state was wrong. LiveLLM makes that market state live.

*[End]*
