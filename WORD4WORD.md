# LiveLLM — WORD4WORD SCRIPT

**How to read:** Bold text = what you say out loud. [Brackets] = what you do on screen.
Speak slowly. Pause at each section break. Let the demo breathe.

---

## OPENING — [hero visible]

Welcome to LiveLLM.

LiveLLM explores verified economic intelligence for autonomous AI agents.

This matters because AI agents are now making real spending decisions — which model to call, which provider to use, whether to buy capacity or use a subscription. And the market data they reason over goes stale almost immediately.

Here's the statistic that frames the problem: ninety-three percent of Google searches now end without a click. AI Overviews answer directly. Meanwhile, agents are making billions of API calls daily using prices from their training data.

The math is correct. The market state is wrong.

---

## PROBLEM — [scroll to "The Problem"]

Let me show you what this looks like.

An agent needs to route two-hundred-forty code reviews per day. Budget: fifty dollars a month. It looks at the models it knows about and picks the cheapest one.

But here's what it doesn't know. It doesn't know about subscription plans that make a model ten times cheaper. It doesn't know about temporary promotions. It doesn't know about free tiers that cover the entire workload.

The advertised price is never the actual decision-relevant economic state.

---

## SCOPE — [stay on problem or scroll slightly]

And this isn't just about LLM inference pricing.

Think about the full economics an agent navigates. OpenCode Go charges ten dollars a month for a subscription that includes MiMo, Hy3, Kimi — each with different effective costs depending on your workload. Z.ai offers pay-as-you-go at seven-and-a-half cents per million input tokens. Cursor charges a flat fee but bundles different models at different rates. Groq has a free tier that covers fourteen-thousand requests per day.

Each provider has its own economics. Its own discounts. Its own promotions that expire. LiveLLM normalizes all of this into a single payload that agents can consume directly.

And this extends beyond LLM inference. The same pattern applies to compute — reserved instances versus spot versus on-demand. It applies to tools — API plans, monthly credits, free tiers. Anywhere an agent makes an economic decision based on external state, that state goes stale.

---

## TRAPS — [scroll to "Five Pricing Traps"]

The landing page shows five traps that make this problem worse.

Nominal is not effective — a subscription looks expensive but amortizes to pennies per request. Time-dependent — peak pricing versus off-peak changes the math. Route-dependent — the same model costs different amounts at different providers. State-dependent — how much quota you have left changes the optimal route. And source disagreement — the docs say one thing, the pricing page says another.

No single source tells you the full picture. LiveLLM does.

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

*[Click Run Demo — logs start streaming]*

While the demo loads, let me tell you what's happening under the hood.

When an agent calls the LiveLLM API, it receives a compact markdown payload. Twenty-three models. Nine providers. Every price verified against official sources. Every fact carries a search ID for provenance.

The agent doesn't browse the web. It doesn't search for prices. It calls one endpoint and gets the current market state. That's the difference between an agent that guesses and an agent that knows.

*[Logs stream — SerpApi search appears]*

There's the live SerpApi search. Search ID attached. Provenance established.

*[Logs continue — LLM decisions appear]*

The agent picks Z.ai from stale data — thirty-six dollars a month. Then with LiveLLM, it discovers MiMo via subscription — ten dollars a month.

*[Let verdict sit on screen]*

Seventy-two percent cheaper. Same agent. Same workload. The route changed because the market state changed.

---

## EVIDENCE — [click "Evidence" tab]

And we can prove where every decision came from.

Every fact traces to a SerpApi search ID. A SHA-256 content hash. A source URL. A verification state.

Old facts are superseded with timestamps, never overwritten. This isn't vibes. It's a provenance chain.

---

## PAYLOAD — [click "Payload" tab → "Generate Payload"]

Now let me show you what the agent actually receives.

*[Click Generate Payload — markdown streams in]*

This is the machine-readable payload from the LiveLLM API.

First block: raw SerpApi markdown — the output-dot-md format, optimized for LLM consumption. Second block: our enriched payload with economics. Cost per request. Subscription multiples. Effective monthly cost.

Twenty-three models. Nine providers. Verified from official pricing pages. Content-addressed with SHA-256.

---

## FUTURE — [stay on payload or scroll to hero]

Now let me tell you where this goes.

Every autonomous agent makes economic decisions daily. Model routers, coding agents, research agents, batch processors. They all need verified market state.

Today that state comes from stale training data. Tomorrow it comes from LiveLLM.

Here's the question I want you to think about: would you rather spend one cent every day on verified market data, or spend the whole day mispricing your token spend?

The answer is obvious. And that's exactly why this becomes infrastructure.

LiveLLM is building toward becoming the go-to endpoint for verifiable live economic intelligence. We refresh our data several times a day. Over weeks, we build up a unique dataset of accurate, verified pricing across LLM inference, compute, and tools.

That dataset is the moat. Every search adds value. Every verification compounds. And with x402 — machine-to-machine payments — agents can pay per-fact for verified state without human intervention.

One cent per query. Verified provenance. The agent decides. The economics are live.

---

## CLOSE — [stay on hero or final view]

The obvious customers: model routers like OpenRouter and LiteLLM. Agent frameworks like CrewAI and AutoGen. Inference gateways like Together and Fireworks.

Every one of these systems makes this exact decision thousands of times a day. One SerpApi search becomes reusable verified intelligence for thousands of downstream decisions.

The agent's math was correct. Its market state was wrong. LiveLLM makes that market state live.

*[End — pause 3 seconds]*
