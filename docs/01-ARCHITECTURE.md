# 01 — Target Architecture

## Product thesis

LLMDeals is a live AI-price/deal intelligence engine.

The difficult problem is not rendering deal cards. It is:

1. knowing that something changed;
2. determining whether the change is economically meaningful;
3. verifying it against an authoritative source;
4. preserving history;
5. recomputing downstream rankings.

SerpApi should solve only (1) for the **unknown web**.

## Separation of responsibilities

### SerpApi
Best at:
- broad discovery;
- fresh news/search;
- finding unknown providers/products;
- locating pricing/docs pages on a newly discovered domain;
- occasional high-recall Search Index `deep` sweeps.

### Direct fetchers
Best at:
- known official pricing/docs URLs;
- APIs;
- RSS/Atom;
- sitemaps;
- conditional HTTP;
- cheap frequent checks.

### Browser agent
Best at:
- JS-heavy or awkward official pages;
- one-off investigation after a signal;
- extracting a page that normal HTTP cannot parse.

### LLM
Best at:
- classifying ambiguous candidates;
- converting unstructured evidence into a proposed structured candidate;
- explaining economic impact.

### Deterministic core
Must own:
- canonical URL identity;
- source authority;
- validation;
- arithmetic;
- fact supersession;
- change events;
- rankings.

## Event flow

```text
DiscoveryQuery
    |
SearchRun
    |
SearchResult
    |
CandidateEvent
    |
Source
    |
SourceObservation
    |
Evidence
    |
Fact
    |
Offer
    |
Derivation
    |
Assessment
    |
MaterializedCurrentDeal
```

## Hard authority boundary

Search result:

`UNVERIFIED DISCOVERY SIGNAL`

Official provider page/API:

`EVIDENCE`

Validated atomic claim:

`FACT`

Calculated multiple/savings/ranking:

`DERIVATION`

Editorial verdict:

`ASSESSMENT`

Never collapse these into one object.

## Data freshness classes

- `HOT`: fast-changing promos/quota pages; direct check every 1–6h.
- `WARM`: pricing/docs; direct check every 6–24h.
- `COLD`: slowly changing provider metadata; weekly.
- `UNKNOWN`: not in registry; discovered through SerpApi.
