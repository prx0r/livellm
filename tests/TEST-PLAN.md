# Deterministic Test Plan

## Search contract
- canonical request ordering does not alter hash;
- whitespace-normalized identical query has same hash;
- material parameter change produces different hash.

## Cache
- second identical request uses local cache;
- simultaneous identical requests singleflight;
- expired local cache invokes provider exactly once.

## URL canonicalization
- UTM/ref params stripped;
- fragments stripped;
- www normalized;
- trailing slash normalized;
- meaningful query parameters retained.

## Candidate prefilter
- pricing/free-tier announcement passes;
- tutorial/review/job result fails;
- score reasons are reproducible.

## Candidate dedupe
- four news articles for one provider launch → one candidate;
- changed price vs changed quota → distinct event fingerprints.

## Source polling
- 304 stops;
- raw-only cosmetic change stops;
- relevant hash change escalates;
- ETag/Last-Modified stored.

## Facts
- new observation with same value does not emit FACT_CHANGED;
- changed verified value supersedes old fact;
- old fact retains historical validity;
- downstream derivation recomputes only from changed inputs.

## Quota governor
- reserve is never spent automatically;
- low remaining balance reduces batch;
- Account API error fails closed to smaller/no batch, not unlimited search.

## Replay
- entire discovery pipeline runs from fixtures with zero network calls.

## Evaluation metrics
- verified changes / paid search;
- new provider discoveries / paid search;
- false candidate rate;
- browser escalations;
- LLM escalations;
- median time-to-detection.
