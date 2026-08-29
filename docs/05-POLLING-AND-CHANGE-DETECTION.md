# 05 — Cheap Polling and Change Detection

## Cheapest-first ladder

For known providers:

1. provider-native API/webhook
2. RSS/Atom
3. sitemap `lastmod`
4. HTTP conditional request
5. normal HTTP + hashes
6. lightweight DOM extraction
7. browser agent
8. LLM analysis

SerpApi is outside this ladder: it is for discovering sources/events not already in the known-source registry.

## HTTP validators

Persist:
- `ETag`
- `Last-Modified`

Request with:
- `If-None-Match`
- `If-Modified-Since`

If response is `304 Not Modified`:
- update last_checked_at;
- stop.

## Three hashes

Do not trigger expensive work on raw HTML changes alone.

Store:

1. `raw_hash`
2. `normalized_text_hash`
3. `relevant_hash`

Relevant hash should isolate likely economic content:
- pricing tables;
- plan cards;
- quota sections;
- model lists;
- limits;
- promotional terms.

Decision matrix:

| Raw | Normalized | Relevant | Action |
|---|---|---|---|
| same | same | same | stop |
| changed | same | same | stop |
| changed | changed | same | stop/log cosmetic |
| changed | changed | changed | investigate |

## Normalization

Strip:
- scripts/styles;
- dynamic timestamps;
- tracking IDs;
- cookie banners where detectable;
- whitespace;
- navigation/footer when using section selectors.

Sort structured key/value tables before hashing where order is irrelevant.

## RSS/Atom

For provider blogs/changelogs:
- persist item GUID/link;
- only inspect unseen items;
- use keyword prefilter before LLM.

## Sitemap

If a provider exposes sitemap:
- track URL + lastmod;
- only fetch changed/new candidate URLs.

## Browser escalation

Only use browser when:
- normal HTTP is blocked/empty;
- content is JS-rendered;
- relevant section cannot be extracted deterministically.

Browser result is still evidence from the official URL, not from the search snippet.

## Change event types

- `SOURCE_CHANGED`
- `FACT_PROPOSED`
- `FACT_CHANGED`
- `OFFER_CREATED`
- `OFFER_EXPIRED`
- `QUOTA_CHANGED`
- `MODEL_ACCESS_CHANGED`
- `PRICE_CHANGED`
- `PROMO_CREATED`
- `PROMO_EXPIRED`

Each event should have before/after and evidence references.
