# LiveLLM

> **The live economic-state API for AI agents.**

**One-line pitch:** LiveLLM gives AI agents verified, current model economics. SerpApi discovers changing prices, quotas, promotions, and provider terms; LiveLLM resolves the official source, validates the fact, and serves it through a machine-readable API and MCP interface.

## The problem

An agent can reason perfectly and still make the wrong decision because the market state it is reasoning over is stale.

Model pricing, rate limits, promotions, subscription quotas, and provider terms change continuously. They are scattered across provider documentation, launch posts, pricing pages, and announcements. An agent deciding whether to route a workload, buy fallback capacity, or wait for a quota reset should not be expected to search the web from scratch and reconcile those facts every time.

LiveLLM turns that changing external state into infrastructure.

## The demo in one sentence

A workload appears to require fallback capacity; LiveLLM performs a fresh SerpApi search, resolves and verifies an official provider update, discovers that a live promotion changes the effective capacity, and the **same agent reroutes its decision** using the updated fact.

That transition is the product:

**stale market state → fresh evidence → verified fact → different agent action**

## What we built

LiveLLM is not a chat interface around search results. The repository contains the components needed to maintain and consume a small economic fact market:

- a structured HTTP API for model and provider market state;
- an MCP server so agents can query the same state directly;
- a bitemporal fact ledger for what was known and when it was true;
- SerpApi-backed live discovery with the originating `search_metadata.id`;
- official-source resolution and source hashing;
- AI-assisted extraction followed by deterministic validation;
- change history and evidence lookup;
- replay mode so the system can be tested without spending live search credits;
- a demo that shows a downstream decision changing when the verified market state changes.

The current clean CI run passes **76/76 tests**.

## Why SerpApi is essential

SerpApi is the live discovery and provenance layer.

Without it, LiveLLM would be another manually maintained pricing table. With it, the system can discover a changed market condition at runtime, identify the authoritative source, retain a replayable search identifier, and then promote the resulting claim only after validation.

In the canonical demo:

1. the agent begins with a stale capacity assumption;
2. LiveLLM runs a no-cache SerpApi search;
3. the result points to the provider's official source;
4. LiveLLM fetches and hashes that source;
5. the changed economic fact is extracted and validated;
6. the agent receives the updated state and changes its action.

**SerpApi does not merely decorate the demo with live search. It is what allows the economic state to become live.**

## Why this can become a real product

Agents are beginning to make economic decisions: which model to call, which provider to use, whether to buy more capacity, whether a subscription is cheaper than API usage, and whether a temporary promotion changes the optimal route.

Those decisions need a small, reliable payload rather than another browsing session.

LiveLLM's natural product surface is therefore an API:

```text
agent / router / gateway
        ↓
    LiveLLM
        ↓
verified market state
        ↓
route / buy / wait / switch
```

The same primitive can sit underneath model routers, coding agents, procurement agents, inference gateways, and autonomous workers.

The repository also exposes an x402-oriented pricing manifest. **Payment enforcement is not claimed as shipped functionality.** The point is that LiveLLM is already narrow, machine-readable, and economically useful enough to be payment-addressable: x402 can become a commercialization boundary without changing the underlying product.

## Why this is different from “search the web”

Search returns documents.

LiveLLM returns a decision-ready fact with:

- the value;
- the entity and field it refers to;
- when it was observed;
- where it came from;
- the discovery/search provenance;
- the source evidence;
- validation state;
- and the history needed to understand what changed.

The agent consumes the fact. The evidence remains inspectable.

## The 2½-minute judge demo

**0:00 — Problem**

> “This agent's math is correct. Its market state is stale.”

Show the baseline workload decision: known capacity is below the required capacity, so the agent chooses fallback.

**0:25 — Live discovery**

Run the live refresh. Show the SerpApi request and the returned `search_metadata.id`.

**0:50 — Official evidence**

Open the official source discovered through SerpApi. Show the promotion or changed provider term and the source hash.

**1:15 — Verification**

Show extraction and deterministic validation. The fact is promoted into LiveLLM's current market state.

**1:40 — Same agent, different action**

Run the original decision again. The new effective capacity now satisfies the workload, so the agent changes its route.

**2:00 — Product surface**

Show the machine-readable payload, evidence endpoint, change history, and MCP tools.

**2:20 — Close**

> “Agents already pay for models. LiveLLM makes the economics they reason over live.”

## Shipped vs. next

### Shipped

- live SerpApi discovery;
- official-source resolution;
- provenance and source hashing;
- verified market facts;
- HTTP API;
- MCP tools;
- change/evidence history;
- deterministic validation;
- replayable tests;
- decision-changing demo.

### Next

- deploy the complete HTTP API as a permanent public service in addition to the demo surface;
- add x402 payment enforcement for paid machine-to-machine access;
- broaden provider and GPU-market coverage;
- add more automatic contradiction and freshness policies.

## SerpApi heavy-lifting line

> **SerpApi is LiveLLM's discovery and provenance layer: it finds changing model economics in real time, resolves the official source, and gives each discovery a replayable search ID before LiveLLM validates and serves the resulting fact.**

## Closing line

> **LiveLLM turns a changing web into verified economic state that agents can act on.**
