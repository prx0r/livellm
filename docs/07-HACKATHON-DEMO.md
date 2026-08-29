# 07 — Hackathon Demo

## Sponsor story

> LLMDeals uses SerpApi as a scarce high-recall radar. Search discovers new market signals; official sources verify them; deterministic economics decides whether the advertised deal is actually valuable.

## 90-second demo

1. Show current LLMDeals top deals.
2. Click **Run Live Radar**.
3. Show SerpApi query/engine and remaining credit governor.
4. A new candidate appears.
5. Show result classified as `UNVERIFIED`.
6. Fetch official provider source.
7. Extract proposed facts.
8. Validator accepts/rejects.
9. If accepted, show before → after economics.
10. `/changes` updates.
11. Show `Searches consumed: 1`.
12. Show historical `useful changes / paid searches` yield.

## Killer visual

```text
LIVE RADAR

SerpApi search       1
Results             10
Known URLs           6
Irrelevant           2
New candidates       2
Officially verified  1
Canonical changes    1

Search yield         1.00 verified changes/search
Monthly remaining    176
```

## Stronger evaluation

Create a frozen historical/replay set of search responses.

Compare:
- known-provider-only watcher;
- generic browser sweep;
- SerpApi radar + direct verifier.

Measure:
- new event recall;
- false candidate rate;
- SerpApi searches/event;
- time-to-detection;
- browser invocations;
- LLM invocations.

## Explicit sponsor dependence

Removing SerpApi should break:
- unknown-provider discovery;
- broad open-web change radar;
- targeted source discovery for new providers.

It should **not** break:
- known source polling;
- deterministic economic math;
- current database rendering.

This proves meaningful integration without architectural dependence on search for everything.
