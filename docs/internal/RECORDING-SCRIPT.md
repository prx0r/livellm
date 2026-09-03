# LiveLLM — Recording Script (3:30)

**Open https://livellm.tradesprior.workers.dev/ in Chrome. Full screen. Read aloud.**

---

## 0:00–0:15 — Hook

**Screen:** Hero visible. "The agent's math was correct. Its market state was wrong."

> "AI agents are becoming budget-aware. But a perfect budgeting algorithm still makes the wrong decision if the data it reasons over is stale."

---

## 0:15–0:40 — Click Run

**Screen:** Click "Run Live Market Check". Watch Step 1 (Baseline) appear.

> "An agent needs to run 2,500 GLM-5.3-Flash requests in 5 hours on OpenCode Go. The baseline capacity is 1,580. That's not enough. The agent plans to buy fallback capacity."

**Point at Step 1: "1,580 < 2,500 → INSUFFICIENT"**

---

## 0:40–1:10 — Baseline Agent Decision

**Screen:** Step 2 appears. MiMo agent says BUY_FALLBACK.

> "We ask MiMo v2.5 — the same model the agent uses — to make the routing call. It says: buy fallback. The deterministic check confirms: 2,500 is greater than 1,580. Correct decision based on stale data."

---

## 1:10–1:40 — Live SerpApi Search

**Screen:** Step 3 appears. Search ID visible.

> "Now LiveLLM searches the live web. SerpApi, Google Light engine, no cache. There's the search ID — proof this is a real search, not cached data."

**Point at the search_metadata.id.**

---

## 1:40–2:10 — Official Source + Extraction

**Screen:** Steps 4-5 appear. Source fetched, extraction shows capacity = 3,160.

> "LiveLLM fetches the official OpenCode Go page. MiMo extracts the current market fact: GLM-5.3-Flash now has a temporary 2× usage promotion. Capacity is 3,160, not 1,580."

---

## 2:10–2:30 — Fresh Agent Decision

**Screen:** Steps 6-7 appear. Validation passes, agent says USE_OPENCODE_GO.

> "Deterministic validation confirms the extraction is sane. We ask MiMo again — same model, same workload, only the market fact changed. It now says: use OpenCode Go. The route changed."

---

## 2:30–2:50 — The Verdict

**Screen:** Step 8 shows ROUTE CHANGED. Final banner appears.

> "Same workload. Same model. Same agent. Fresh market state changed the decision. The agent's math was correct. Its economic state was wrong."

---

## 2:50–3:10 — The Close

> "LiveLLM is the verified economic state layer for autonomous agents. We discover pricing changes via SerpApi, validate them against official sources, and serve provenance-backed facts. An agent that knows what things actually cost can make good economic decisions."

---

## 3:10–3:30 — End

> "We built the instrument panel."

**End on the hero.**

---

## Key Numbers

| Number | Value |
|--------|-------|
| Baseline capacity | 1,580 requests/5h |
| Live capacity | 3,160 requests/5h (2× promotion) |
| Required | 2,500 requests/5h |
| Baseline decision | BUY_FALLBACK |
| Live decision | USE_OPENCODE_GO |
| Route changed | YES |

## If a Judge Asks

**"Is the SerpApi search real?"** — Yes. The search_metadata.id is visible. no_cache=true forces a fresh fetch. The search finds opencode.ai/go as the official source.

**"Is the MiMo call real?"** — Yes. Two live calls via OpenCode Go API. Same model both times. Only the market fact in the prompt changes.

**"What if the promotion expires?"** — The extraction would return capacity = 1,580 (no promotion). The agent would correctly say BUY_FALLBACK. The system fails closed.
