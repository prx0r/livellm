# LiveLLM — WORD4WORD SCRIPT

**How to read:** Bold text = what you say out loud. [Brackets] = what you do on screen.
Speak slowly. Pause at each section break. Let the demo breathe.

---

## OPENING — [hero visible, don't scroll yet]

Welcome to LiveLLM.

LiveLLM explores verified economic intelligence for autonomous AI agents.

This matters because AI agents are now making real spending decisions — which model to call, which provider to use, whether to buy capacity or use a subscription. And the market data they reason over goes stale almost immediately.

Here's the statistic that frames the problem: ninety-three percent of Google searches now end without a click. AI Overviews answer directly. Meanwhile, agents are making billions of API calls daily using prices from their training data.

The math is correct. The market state is wrong.

---

## PROBLEM — [scroll down to "The Problem" section]

Let me show you what this looks like.

An agent needs to route two-hundred-forty code reviews per day. Budget: fifty dollars a month. It looks at the models it knows about and picks the cheapest one.

But here's what it doesn't know. It doesn't know about subscription plans that make a model ten times cheaper. It doesn't know about temporary promotions. It doesn't know about free tiers that cover the entire workload.

The advertised price is never the actual decision-relevant economic state.

---

## SOLUTION — [scroll to "How It Works"]

Here's how we solve it.

We use SerpApi to discover changing model economics from the live web. Not from training data. Not from cached tables. From the live web.

Every search gives us a search ID. We follow the result to the provider's official pricing page. We extract structured facts with AI. We validate them with six deterministic checks. And we serve the result through an API that agents consume directly.

SerpApi is not decoration here. It is the discovery layer. Remove it, and LiveLLM becomes another stale pricing table.

---

## SERPAPI — [scroll to "SerpApi Integration"]

The key insight for agents: SerpApi's markdown output format gives us a payload that's fifty percent fewer tokens than JSON. Agents ingest it directly. No parsing. No transformation.

We use Google Light for official source resolution. Search Index Deep for discovering providers we weren't looking for. And the Account API for quota governance. Every observation carries the search ID as provenance.

---

## DEMO — [click "Try the Live Demo" → /demo → click "Run Demo"]

Let me show you live.

*[Logs start streaming]*

The agent starts with stale data — a pay-as-you-go price list. It picks Z.ai GLM-5.3-Flash at roughly thirty-six dollars a month.

Now LiveLLM refreshes. A live SerpApi search hits the current official provider surface. We get a search ID. Provenance attached to this specific discovery.

The agent reroutes. It finds OpenCode Go MiMo V2.5 at ten dollars a month. A subscription that wasn't visible in the stale data.

*[Pause — let verdict sit on screen]*

Seventy-two percent cheaper. Same agent. Same workload. The route changed because the market state changed.

---

## EVIDENCE — [click "Evidence" tab]

And we can prove where every decision came from.

Every fact traces to a SerpApi search ID. A SHA-256 content hash. A source URL. A verification state.

Old facts are superseded with timestamps, never overwritten. This isn't vibes. It's a provenance chain.

---

## PAYLOAD — [click "Payload" tab → "Generate Payload"]

This is the machine-readable payload the agent receives.

First block: raw SerpApi markdown — the output-dot-md format, optimized for LLM consumption. Second block: our enriched payload with economics. Cost per request. Subscription multiples. Effective monthly cost.

Twenty-three models. Nine providers. Verified from official pricing pages.

---

## CLOSE — [stay on payload or scroll to hero]

The obvious customers: model routers like OpenRouter and LiteLLM. Agent frameworks like CrewAI and AutoGen. Inference gateways like Together and Fireworks.

Every one of these systems makes this exact decision thousands of times a day. One SerpApi search becomes reusable verified intelligence for thousands of downstream decisions.

The agent's math was correct. Its market state was wrong. LiveLLM makes that market state live.

*[End — pause 3 seconds]*
