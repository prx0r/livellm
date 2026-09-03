# LiveLLM — Presentation Script (2 minutes)

---

## The Problem (0:00 — 0:20)

> "Every agent makes economic decisions — which model, which provider, whether to buy capacity. But the market data they reason over is stale.
>
> Cursor agents burn budget on Claude Sonnet when DeepSeek does the same job at 1/20th the price. Routers pick GPT-4o when a subscription model would be 10x cheaper. Batch classifiers pay for API calls when free tiers cover their workload.
>
> The math is correct. The market state is wrong."

**Show:** Hero text on landing page. The "Without LiveLLM" box: $0.075/M looks cheapest, but it's the wrong model with the wrong context window.

---

## The Thesis (0:20 — 0:35)

> "LiveLLM fixes this. SerpApi discovers changing prices in real time — not from training data, not from cached tables, from the live web. We verify against official sources. The agent gets a compact, provenance-backed payload.
>
> Same agent, same workload — different decision."

**Show:** The 5-step pipeline on the landing page. SerpApi → Official Source → AI Extraction → Validation → Fact Ledger.

---

## The Demo (0:35 — 1:10)

> "Watch."

Click **Try the Live Demo** → lands on `/demo` → click **Run Demo**.

Logs stream live:
- "23 models loaded from fact ledger"
- Agent receives stale price list: Z.ai $0.075/M, DeepSeek $0.14/M
- Agent picks Z.ai at $39/mo
- Agent receives LiveLLM payload: MiMo $0.14/M + $10 sub
- Agent picks MiMo at $6/mo
- search_id, content_hash, cost math streaming

> "The agent picked Z.ai from stale data. With LiveLLM, it discovers MiMo via subscription — 85% cheaper. Same model, same workload."

---

## The Evidence (1:10 — 1:25)

Click **Evidence** tab.

> "Every fact traces to a SerpApi search ID, a content hash, a source URL. Not vibes. Verifiable."

**Show:** search_id, content_hash (SHA-256), stale_route, live_route, cost breakdown.

---

## The Agents (1:25 — 1:40)

Click **Demo 2** tab → **Run Agent Comparison**.

> "Three agents, same payload. Coding agent, research agent, batch classifier. Each picks the optimal route for its workload."

**Show:** Side-by-side stale vs live decisions for each agent persona.

---

## The Moat (1:40 — 2:00)

> "The moat: verified economic intelligence compounds. Every search, every verification, every fact builds a dataset that gets more valuable over time.
>
> We track 23 models across 9 providers. 368 active facts. Temporal supersession — old facts are never overwritten, they're superseded with timestamps.
>
> This dataset is sellable. Model routers, agent frameworks, inference gateways — they all need verified, current economics. LiveLLM is the source of truth.
>
> SerpApi discovers. We verify. Agents decide."

---

## Tab Order (matches presentation flow)

| Tab | When | What judges see |
|-----|------|----------------|
| **Demo** | 0:35 | Streaming logs, verdict |
| **Evidence** | 1:10 | Provenance chain |
| **Demo 2** | 1:25 | Agents side-by-side |
| **Payload** | 1:40 | 23-model market data |

---

## Key Lines

- "The agent's math was correct. Its market state was wrong."
- "Same model, same workload, same agent. Only the market data changed."
- "SerpApi discovers the change. LiveLLM verifies it. The agent reroutes."
- "23 models, 9 providers, verified from official pricing pages."
- "Content-addressed provenance — every fact traces to a search ID."
- "Agents already pay for models. LiveLLM makes the economics they reason over live."

---

## What Judges Should Feel

1. **This is a real problem** — stale market data costs agents real money
2. **SerpApi is causal** — remove it and the product becomes a stale table
3. **The demo has a real behavioral consequence** — the same agent changes its route
4. **It's infrastructure-shaped** — HTTP API, MCP, evidence history, temporal facts
5. **The moat is real** — verified intelligence compounds and is sellable

---

## If Asked About Market Size

- **Agent routing:** Every model router needs current pricing (OpenRouter, LiteLLM, Portkey)
- **Agent frameworks:** CrewAI, AutoGen, LangChain all route to models
- **Inference gateways:** Together, Anyscale, Fireworks need cost optimization
- **Enterprise procurement:** Teams spending $10K+/mo on API calls need cost visibility
- **x402 economy:** Machine-to-machine payments need machine-readable pricing

---

## If Asked About Competition

- **CloudPrice:** Tracks compute prices, not LLM economics
- **AgentDeals:** Tracks free tiers, not subscription amortization
- **LiteLLM:** Routes models, doesn't verify prices
- **OpenRouter:** Shows prices, doesn't detect changes or verify sources

LiveLLM is the only system that discovers changes via search, verifies against official sources, and serves provenance-backed facts with temporal tracking.

---

## Recording Checklist

- [ ] Landing page loads at `/`
- [ ] "Try the Live Demo" goes to `/demo`
- [ ] Demo tab: Run Demo → logs stream → verdict appears
- [ ] Evidence tab: auto-populates from demo
- [ ] Demo 2 tab: Run Agent Comparison → agents stream → results appear
- [ ] Payload tab: Generate Payload → SerpApi call → markdown streams
- [ ] No loading spinners stuck
- [ ] No "click run demo first" text
- [ ] All timestamps correct
- [ ] No stale references to Pipeline, Story, or API tabs
