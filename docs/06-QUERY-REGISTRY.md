# 06 — Query Registry and Adaptive Search

## Query object

A search is a versioned object, not an arbitrary string.

Fields:
- id
- engine
- q
- parameters
- purpose
- minimum interval
- last run
- paid run count
- useful hit count
- enabled
- priority
- version

## Starter portfolio

### Daily-ish: AI inference economics
Purpose: new API pricing/free tier/credits.

Example query family:
`("AI API" OR "LLM API") (pricing OR "free tier" OR credits OR quota OR subscription)`

### Daily-ish: coding-agent subscriptions
`("coding agent" OR "AI coding") (pricing OR plan OR subscription OR credits)`

### Daily-ish: changes/news
Use Google News Light or full News date-sorted:
`(OpenAI OR Anthropic OR Gemini OR Mistral OR Groq OR Cerebras OR OpenRouter) (pricing OR quota OR "free tier" OR subscription)`

### Rotating: unknown free inference
`("free inference" OR "free API credits") (LLM OR AI model)`

### Weekly: unknown-unknown sweep
Search Index `mode=deep`:
`AI model API pricing free tier credits coding agent subscription`

## Provider onboarding query

When a new domain is discovered:

`site:DOMAIN (pricing OR plans OR credits OR "rate limits" OR subscription OR quota)`

One call should identify likely official source URLs.

## Deterministic candidate score

Example:
- +4 `pricing`
- +4 `free tier`
- +4 `subscription`
- +3 `credits`
- +3 `quota`
- +3 `rate limit`
- +2 `launch`
- +2 `developer plan`
- -5 `stock price`
- -5 `jobs`
- -4 `tutorial`
- -4 `review`
- -4 `course`

Only high-scoring results go to LLM classification.

## Adaptive scheduler score

For a query q:

```text
priority(q) =
  expected_information_yield
  × freshness_need
  × commercial_value
  × staleness
  ÷ estimated_credit_cost
```

Execute top N within the daily paid-search budget.

## Dedupe

### URL identity
Normalize:
- lowercase host;
- remove fragment;
- strip `utm_*`, `ref`, tracking params;
- normalize trailing slash;
- optionally normalize `www`.

### Candidate event identity
Fingerprint approximately:
`provider + product + change_type + effective_date`

Multiple articles about one provider event should collapse into one candidate.

## Search-result reprocessing rule

Already-seen URL:
do not reinvestigate unless:
- title/snippet digest changed;
- linked official source changed;
- time-based revalidation threshold passed.
