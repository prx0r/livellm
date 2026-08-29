# LLMDeals × SerpApi Integration Kit

Purpose: turn SerpApi into a **scarce, high-recall discovery radar** for LLMDeals without wasting the 250-search free allowance.

## Core design

```text
KNOWN WEB                                  UNKNOWN WEB
official APIs / RSS / sitemaps             SerpApi Search / News / Search Index
conditional HTTP / hashes                          |
         |                                           |
         +---------------- CHANGE SIGNAL ------------+
                              |
                       CandidateEvent
                              |
                    official-source fetch
                              |
                    deterministic validation
                              |
                    canonical atomic facts
                              |
                     derived deal economics
                              |
                       /api/v1/changes
```

The rule:

> **SerpApi discovers what LLMDeals does not know to look for. Direct polling checks what LLMDeals already knows. Browser/LLM work only happens after a change signal.**

## Current-repo fit

The existing repo already has the right downstream conceptual pipeline:

`DISCOVERY → VERIFICATION → NORMALIZATION → ASSESSMENT → EDITORIAL`

and already publishes deterministic deal rankings, evidence, history diffs, and agent-facing JSON APIs.

The main migration is below the UI:

1. split `source`, `observation`, `fact`, `offer`, `derivation`, `assessment`;
2. move canonical state to SQLite;
3. make `seed.json` / `deals-derived.json` materialized exports;
4. add a query-budgeted discovery service;
5. make known-source polling mostly zero-SerpApi-cost.

## Pack contents

- `docs/01-ARCHITECTURE.md` — target system.
- `docs/02-SERPAPI-CAPABILITIES.md` — useful SerpApi features and when to use them.
- `docs/03-QUOTA-PLAYBOOK.md` — how to make 250 searches enough.
- `docs/04-DATA-MODEL-MIGRATION.md` — current → event/fact/source model.
- `docs/05-POLLING-AND-CHANGE-DETECTION.md` — ETag/hash/RSS/sitemap tricks.
- `docs/06-QUERY-REGISTRY.md` — starter query portfolio and adaptive yield algorithm.
- `docs/07-HACKATHON-DEMO.md` — sponsor-facing proof.
- `docs/08-IMPLEMENTATION-ORDER.md` — checkpoint plan.
- `db/001_serpapi_radar.sql` — proposed SQLite schema.
- `src/search/*` — TypeScript search provider, SerpApi adapter, cache/replay.
- `src/discovery/*` — canonicalization, deterministic prefilter, query registry.
- `src/polling/*` — cheap source polling and scheduler scoring.
- `fixtures/README.md` — record/replay method.
- `tests/TEST-PLAN.md` — deterministic tests.
- `.env.example` — environment variables only; no secrets.

## Official SerpApi docs used

- https://serpapi.com/search-api
- https://serpapi.com/google-light-api
- https://serpapi.com/google-news-light-api
- https://serpapi.com/account-api
- https://serpapi.com/search-archive-api
- https://serpapi.com/search-index-api
- https://serpapi.com/json-restrictor
- https://serpapi.com/markdown-output
- https://serpapi.com/google-news-api

## Non-goals

- SerpApi is **not** canonical evidence.
- Search snippets do **not** directly mutate prices.
- A browser agent does **not** poll every known provider.
- Tests do **not** make live SerpApi calls.
- UI requests do **not** trigger search calls.
