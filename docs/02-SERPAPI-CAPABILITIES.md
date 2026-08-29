# 02 — SerpApi Capabilities That Matter

## 1. Exact-query one-hour cache

Official behavior:
- cache is used only when query **and all parameters are exactly identical**;
- cache expires after one hour;
- cached searches are free and do not count against monthly searches;
- `no_cache=false` is the default.

Engineering implication:
- canonicalize query configs;
- never add timestamps/nonces;
- keep locale/device parameters stable;
- add a local cache above SerpApi too.

Use:
- repeated demos;
- multiple agents requesting the same radar query;
- concurrent UI/backend consumers.

## 2. Google Light

Use `engine=google_light` for normal discovery when organic results are enough.

Why:
- intentionally strips extra-rich Google result types;
- designed for faster responses;
- still exposes useful organic results.

Default LLMDeals web discovery engine:
`google_light`, not full `google`.

## 3. Google News Light

Use `engine=google_news_light` for fast announcement/change discovery.

Useful fields:
- title
- link
- source
- snippet
- date
- position

Good queries:
- pricing change
- new plan
- subscription launch
- free tier
- quota/rate-limit change
- credits/promotion
- deprecation

Use full Google News only if you need richer news-specific structure.

## 4. Full Google News sorting

Full Google News supports sorting by date (`so=1` in current docs). This is useful when you care about the newest announcements rather than relevance.

Use this sparingly:
- daily market-change sweep;
- demo showing "what changed recently."

## 5. Search operators

Normal Google operators work:
- `site:`
- `inurl:`
- `intitle:`

High-value use:
after discovering a new provider, run one targeted query:

`site:newprovider.com (pricing OR plans OR credits OR "rate limits" OR subscription)`

This converts a broad discovery into candidate authoritative URLs.

## 6. JSON Restrictor

Use `json_restrictor` to avoid hauling irrelevant response sections through the pipeline.

Discovery normally needs only:
- result position;
- title;
- link;
- snippet;
- source;
- date.

Benefits:
- smaller network payload;
- less parsing;
- less context if any output reaches an LLM.

## 7. Markdown output

SerpApi supports Markdown output on supported engines for agent/LLM consumption.

Design:
- JSON restricted output → deterministic pipeline.
- Markdown → only for a selected candidate that an agent needs to reason about.

Zero LLM tokens beats cheaper LLM tokens: prefilter before using Markdown.

## 8. Account API

Account API is free and does not consume monthly quota.

Use it before every discovery batch to enforce:
- remaining-search reserve;
- hourly guard;
- emergency demo reserve.

Recommended governor:
- >100 left: normal strategy.
- 50–100: high-yield queries only.
- 20–50: critical radar only.
- <20: demo/emergency only.

## 9. Search Archive

A completed search can be fetched from the Search Archive for up to 31 days using `search_metadata.id`.

Use:
- record once;
- replay fixtures;
- debugging;
- reproducible hackathon evaluation.

Tests should never require live SerpApi.

## 10. Search Index + `mode=deep`

Search Index `mode=deep` expands recall via parallel sub-query fan-out.

Use as a **weekly unknown-unknown sweep**, not routine polling.

Question it should answer:
"What providers/offers are outside our current watchlist?"

## 11. Async searches

SerpApi supports `async=true` and later retrieval through Search Archive.

Potential use:
- batch discovery worker;
- do other work while searches run.

Not essential for the hackathon MVP. Prefer synchronous simplicity until measurement proves async is useful.

## 12. Pagination

Every extra page means more search activity. For discovery:
- improve query quality first;
- default to first page;
- paginate only if the first page has demonstrated positive yield.
