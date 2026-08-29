# 04 — Data Model Migration

## Problem with the current shape

Current offer records combine:
- economic values;
- source URL;
- quotes;
- verification state;
- observation timestamp.

That works for static publishing but makes it hard to answer:
- exactly which source changed?
- which atomic claim changed?
- which derivations depend on that claim?
- did only HTML noise change?
- when was the previous value valid?

## Target model

### Provider
Stable identity.

### Source
A URL/API/feed that can be observed repeatedly.

Fields:
- `source_id`
- `provider_id`
- `url`
- `canonical_url`
- `kind`
- `authority`
- `poll_strategy`
- `poll_interval_seconds`
- HTTP validators/state
- last observed/changed timestamps.

### SourceObservation
Immutable event for one fetch.

Fields:
- observed_at
- status
- ETag
- Last-Modified
- raw hash
- normalized hash
- relevant-section hash
- body storage reference if retained.

### Evidence
A piece of source content supporting a claim:
- source observation;
- quote/structured path;
- field name;
- optional page/selector;
- evidence hash.

### Fact
Atomic authoritative claim:
- entity;
- field;
- typed value;
- unit;
- evidence id;
- valid_from;
- valid_to;
- confidence;
- verification state.

Examples:
- `opencode-go.price_recurring_usd = 10`
- `openrouter-free.free_requests_per_day = 50`

### Offer
Semantic grouping of related facts.

No evidence quote duplicated inside the offer.

### Derivation
Pure calculated output:
- formula id/version;
- exact input fact ids;
- value.

### Assessment
Editorial/ranking interpretation.

## Fact supersession

Never mutate old fact value in place.

When a verified value changes:

```text
old fact.valid_to = observed/effective boundary
insert new fact
emit FACT_CHANGED event
recompute dependent derivations
```

## Materialized current view

Generate current deal JSON for Astro:

`facts + offers + derivations + assessments → web/src/data/deals-derived.json`

This preserves your current static-first frontend.

## Migration order

1. Create new tables without deleting current data.
2. Import each existing `source_url` into `sources`.
3. Convert current quote/value pairs into baseline observations/evidence/facts.
4. Keep old `seed.json` export working.
5. Switch validators to propose facts rather than whole deals.
6. Make SQLite canonical.
7. Treat `seed.json` as generated snapshot.
