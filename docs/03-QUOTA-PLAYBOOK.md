# 03 — Making 250 Searches Enough

## Core rule

**A search credit should buy information about the unknown web.**

Do not use search credits for:
- reading a known pricing page;
- checking whether an already known page changed;
- UI refreshes;
- tests;
- repeated agent questions;
- facts you can obtain from an official API/RSS/feed.

## Suggested monthly budget

Conservative prototype budget:

| Purpose | Searches/month |
|---|---:|
| 3 daily high-yield radar queries | 90 |
| 1 rotating query every other day | 15 |
| 2 Search Index deep sweeps/week | 8–10 |
| query experiments/evaluation | 40 |
| integration/debug | 20 |
| untouched demo/emergency reserve | 75+ |

Do not optimize to consume the allowance.

## Local cache

Cache key:

`sha256(stable_json({engine,q,hl,gl,location,tbs,so,start,...}))`

Recommended TTLs:
- repeated interactive/demo request: 1h;
- daily radar: until next scheduled run;
- fixtures: permanent by content hash.

## Singleflight

If 4 callers request the same query simultaneously:
- one request goes to SerpApi;
- all callers await the same promise.

## Credit governor

Before a batch:
1. call free Account API;
2. obtain `total_searches_left`;
3. calculate allowed batch size;
4. preserve a fixed reserve.

Pseudo-policy:

```text
reserve = 20
available = max(0, searches_left - reserve)

if searches_left <= 20: batch = 0 except manual demo
if searches_left <= 50: batch = min(1, available)
if searches_left <= 100: batch = min(2, available)
else: batch = min(configured_budget, available)
```

## Query yield

For each query q:

`yield_q = verified_meaningful_changes / paid_search_runs`

Also track:
- new URLs/search;
- candidates/search;
- official sources discovered/search;
- false-candidate rate;
- median time-to-detection.

Adaptive cadence:
- yield >= 0.25 → daily
- 0.05–0.25 → every 3 days
- <0.05 → weekly
- 0 useful hits after 10 paid runs → disable/rewrite.

## Provider volatility

For provider p:

`volatility_p = meaningful_fact_changes / observation_days`

Use it for **direct source polling**, not SerpApi.

High-volatility source:
- frequent cheap conditional fetch.

Low-volatility source:
- less frequent.

## Cost matrix experiment

Use Account API before and after a controlled single run of:
- `google_light`
- `google_news_light`
- `google_news`
- `search_index`
- `search_index mode=deep`
- exact cached repeat

Persist measured delta in:
`data/serpapi-cost-matrix.json`

Do not assume undocumented billing edge cases.
