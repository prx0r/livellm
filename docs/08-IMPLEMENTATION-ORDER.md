# 08 — Implementation Order

## CP0 — Freeze current behavior
- current build passes;
- snapshot `seed.json`;
- snapshot `/api/v1/top,deals,changes`;
- no UI redesign.

## CP1 — Search abstraction
- implement `SearchProvider`;
- fixture/replay provider;
- SerpApi provider behind env flag;
- zero live searches in tests.

## CP2 — Query registry + local cache
- canonical query signature;
- SQLite search cache;
- singleflight;
- query/run metrics.

## CP3 — Source registry
- migrate current `source_url` values;
- source IDs;
- authority/kind;
- polling metadata.

## CP4 — Cheap direct poller
- ETag/Last-Modified;
- raw/normalized/relevant hashes;
- no browser/LLM if unchanged.

## CP5 — Discovery candidates
- SerpApi result normalization;
- URL canonicalization;
- deterministic keyword prefilter;
- candidate dedupe.

## CP6 — Observation/fact model
- immutable source observations;
- evidence;
- atomic facts;
- supersession;
- change events.

## CP7 — Existing deal engine compatibility
- materialize current deal shape from DB;
- preserve existing Astro UI/API.

## CP8 — Adaptive scheduler
- Account API governor;
- query yield;
- daily budget;
- reserve.

## CP9 — Live radar UI
- show search→candidate→verify→change flow;
- show remaining quota and yield.

## CP10 — Evaluation
- recorded fixtures;
- comparison metrics;
- failure cases.

## Stop conditions
Do not build:
- new frontend framework;
- custom browser automation framework;
- custom agent framework;
- full distributed queue;
- multi-region infrastructure.

The hackathon claim is discovery efficiency + trustworthy deal intelligence.
