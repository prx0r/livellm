Yes. I inspected the current `prx0r/livellm` `main` at **`60b9e5736022482d09dd4fa718f47f91a7393790`**, including the full tree, TypeScript modules, SQL schema, docs, fixture plan, and current SerpApi docs. The repo currently has one commit from August 29.

My assessment has changed a bit after going through the implementation rather than just the architecture:

## Verdict

**The architecture is excellent. The implementation is about 25–30% of the way to the product described by the architecture.**

Right now I would score it:

| Area                       |    Now | Realistic after plan |
| -------------------------- | -----: | -------------------: |
| Originality                | 8.5/10 |           **9.5/10** |
| Technical architecture     |   9/10 |           **9.5/10** |
| Actual technical execution |   4/10 |             **9/10** |
| SerpApi integration depth  |   5/10 |            **10/10** |
| AI component               |   2/10 |             **9/10** |
| Reliability/evaluation     |   2/10 |             **9/10** |
| Usability/demo             |   1/10 |             **9/10** |
| Product potential          |   9/10 |             **9/10** |

The sponsor asks specifically for an **AI application** where structured real-time SerpApi data makes the AI experience more accurate/useful/impactful, and judges originality, technical execution, SerpApi integration, usability and impact. ([DevNetwork Hackathon 2026][1])

The key is therefore not “use more SerpApi APIs.” It is:

> **Show SerpApi acquiring information an AI could not reliably know statically, then prove what changed because of that live information.**

That should dictate everything you build.

---

# 1. What is genuinely strong already

Your best decision is the information hierarchy:

```text
SEARCH RESULT
    ↓
unverified discovery signal

OFFICIAL SOURCE
    ↓
evidence

VALIDATED CLAIM
    ↓
fact

CALCULATION
    ↓
derivation

INTERPRETATION
    ↓
assessment
```

That separation is excellent.

It solves one of the biggest problems with the original LLMDeals implementation: provenance, observation, values, calculations and editorial scoring aren't stuffed into one record.

The SQL design is also unusually serious for a hackathon. You've already modeled:

* source observations,
* evidence,
* temporally valid facts,
* offers,
* derivations,
* assessments,
* search runs,
* individual search results,
* candidate events,
* change events,
* SerpApi search IDs,
* local search cache.

That's the basis of a real market-data system.

And this principle is exactly correct:

> spend SerpApi credits on the unknown web; directly poll known official sources.

This is far more sophisticated than using SerpApi for every page refresh.

---

# 2. But almost all the interesting architecture is still documentation

The current root contains:

```text
.env.example
MANIFEST.json
README.md
db/
docs/
fixtures/
src/
tests/
```

There is still **no `package.json`, `tsconfig.json`, lockfile, executable entrypoint, `.gitignore`, actual test suite or CI workflow**.

There is only one commit.

So currently:

```bash
npm install
npm test
npm run radar
```

cannot work.

Your `tests/` directory is a test **plan**, not tests.

Your default configuration says:

```text
LLMDEALS_SEARCH_MODE=replay
LLMDEALS_FIXTURE_DIR=./fixtures/serpapi
```

but there are no actual SerpApi fixtures there—only the fixture README.

So even the default replay mode isn't complete.

### P0: turn the spec into software.

---

# 3. The biggest sponsor-fit issue: there is almost no AI yet

This is important.

The sponsor calls for an **AI application**.

At present your actual candidate classifier is this:

```text
pricing       +4
free tier     +4
subscription  +4
credits       +3
...
tutorial      -4
review        -4
```

That's a perfectly reasonable deterministic **prefilter**.

But there is no implemented:

```text
LLM classifier
LLM extraction
AI recommendation
AI answer
AI verification
AI agent
```

after it.

Your architecture says ambiguous candidates eventually reach an LLM, but that isn't implemented.

For this sponsor specifically, fix that.

The correct pipeline is:

```text
SerpApi
   ↓
deterministic cheap prefilter
   ↓
only interesting candidate
   ↓
AI structured extraction
   ↓
deterministic verification
   ↓
canonical fact
```

That is a defensible use of AI rather than using a model for arithmetic.

---

# 4. Actual bug: full Google News parsing is broken

Your generic adapter does:

```ts
source: r.source ? String(r.source) : undefined
```

Full `google_news` currently returns `source` as an **object**, with fields such as `name`, `icon`, and `authors`. ([SerpApi][2])

So this can become:

```text
source = "[object Object]"
```

Also, full Google News returns a proper `iso_date`, while your normalizer stores only `date`. ([SerpApi][2])

Change your model to something like:

```ts
type SearchSource = {
  name?: string;
  authors?: string[];
};

type SearchHit = {
  position?: number;
  title: string;
  url: string;
  snippet?: string;

  source?: SearchSource;

  publishedAt?: string;     // ISO
  publishedAtRaw?: string;  // original SerpApi field
};
```

---

# 5. Your generic SerpApi adapter is too generic

This is becoming a bigger architectural problem.

`SearchEngine` currently supports:

```text
google_light
google_news_light
google_news
search_index
```

and every engine gets flattened through essentially:

```text
news_results ?? organic_results
```

But SerpApi exposes useful engine-specific structures that you're throwing away.

For Google Light alone you can get:

* organic results,
* related questions,
* related searches,
* top stories,
* Latest From,
* knowledge graph.

([SerpApi][3])

These aren't noise.

They're potentially separate **sensors**.

Change the abstraction from:

```text
SerpApi response
→ SearchHit[]
```

to:

```text
SerpApi response
→ SearchEnvelope
    ├── results
    ├── relatedQuestions
    ├── relatedSearches
    ├── topStories
    ├── latestFrom
    ├── aiOverview
    └── metadata
```

Then each engine adapter normalizes the fields it actually provides.

---

# 6. `output=md` will currently break your adapter

Your documentation correctly identifies Markdown output as useful.

But the implementation always does:

```ts
const raw = await res.json()
```

If a caller sets:

```text
output=md
```

through `request.params`, SerpApi will send Markdown and the JSON parser will fail.

SerpApi currently supports Markdown across its APIs via:

```text
output=md
/search.md
Accept: text/markdown
```

and claims roughly 50% average token savings; its current published comparison shows Google Search at around 74% fewer tokens in Markdown than its JSON example. ([SerpApi][4])

Implement separate methods:

```ts
searchJson()
searchMarkdown()
```

Don't pretend one response type handles both.

---

# 7. `async=true` is also not actually implemented

Your request model accepts arbitrary parameters.

So someone can currently issue:

```text
async=true
```

But then `SerpApiProvider.search()` expects the immediate response to contain finished organic/news results.

SerpApi's async behavior is:

```text
submit
→ queued/processing
→ retrieve later using Search Archive
```

and `async` cannot be combined with `no_cache`. ([SerpApi][5])

So either:

**for MVP:** reject `async=true`.

Or properly implement:

```ts
submitSearch()
getArchivedSearch()
awaitSearch()
```

I would do the former until the synchronous path works.

---

# 8. Search freshness needs to be part of the type system

Don't pass:

```ts
params: {
  no_cache: true
}
```

around arbitrarily.

Model intent:

```ts
type FreshnessPolicy =
  | "cache_ok"
  | "force_fresh"
  | "replay";
```

Then adapter translates:

```text
cache_ok
→ normal SerpApi request

force_fresh
→ no_cache=true

replay
→ ReplaySearchProvider
```

Because those states have materially different epistemic meaning.

Your event UI can then say:

```text
Observation source      SerpApi
Freshness               FORCED LIVE
Search ID               68...
Official verification   YES
```

SerpApi caches exactly equivalent searches for one hour; cached searches don't consume monthly searches. `no_cache=true` forces a new search. ([SerpApi][5])

---

# 9. Your cache design is good but unfinished

This is good:

```ts
const inflight = new Map<string, Promise<SearchResponse>>();
```

and:

```text
canonical request
→ SHA-256
→ local cache
→ singleflight
```

But `CacheStore` has no implementation.

Ironically, the SQL schema already includes:

```text
search_cache
```

Wire it up.

I'd also distinguish:

```text
LIVE_SERPAPI
SERPAPI_CACHE_ALLOWED
LOCAL_CACHE
REPLAY
```

rather than one `fromCache: boolean`.

---

# 10. Direct source polling currently misclassifies failures as changes

This is a real reliability bug.

`pollHttpSource()` treats any response other than `304` as a body to hash.

So:

```text
pricing page → 503 maintenance page
```

can look like:

```text
MATERIAL PRICE PAGE CHANGE
```

Implement:

```text
200–299 → evaluate body

304
→ unchanged

404/410
→ source availability event
   DO NOT mutate economic facts

429
→ backoff

500–599
→ transient failure

timeout/network
→ transient failure
```

Also add:

* timeout,
* body-size limit,
* content-type validation,
* retry policy,
* redirect ceiling.

---

# 11. `relevantHash` isn't relevant yet

The design says three hashes:

```text
raw
normalized
economically relevant
```

which is exactly right.

But implementation currently admits:

> use normalized full page.

So a changed footer can still trigger investigation.

Add source extraction configurations:

```json
{
  "provider": "foo",
  "source": "pricing",
  "selectors": [
    "#pricing-table",
    "[data-plan]",
    ".rate-limits"
  ]
}
```

Then:

```text
rawHash
normalizedHash
economicHash
```

Only `economicHash` should escalate automatically.

---

# 12. Don't regex-parse HTML as your final normalizer

Your current HTML cleanup is a handful of regex replacements.

Fine for MVP testing.

Not fine as your evidence layer.

Use an HTML parser and extract:

```text
main
article
tables
JSON-LD
specific configured selectors
```

Then normalize:

* HTML entities,
* whitespace,
* table row ordering where appropriate,
* numeric formatting,
* currency symbols.

The raw document hash is still useful. Just don't derive economic facts from regex-stripped whole HTML.

---

# 13. Add an SSRF boundary

The architecture discovers URLs on the open web and later server-side fetches them.

Before making this public:

* allow only HTTPS/HTTP,
* reject loopback,
* reject link-local,
* reject RFC1918 private networks,
* resolve DNS before fetch,
* re-check destination after redirects,
* cap redirects,
* limit response size.

Most hackathon projects completely forget this.

Mentioning and testing it improves technical-execution credibility.

---

# 14. The database needs a few more provenance fields

Your DB is strong already. I'd extend `search_runs` with:

```text
query_version
engine
freshness_policy
output_format
serpapi_status
serpapi_created_at
serpapi_processed_at
duration_ms
quota_before
quota_after
response_hash
```

Your existing `search_runs` already tracks search ID, result count, new URLs, candidates and verified changes.

That's great.

Also add to `search_results`:

```text
result_type
source_json
published_at_raw
published_at_iso
```

And define clearly:

```text
occurred_at
detected_at
verified_at
```

A provider may announce a change today that becomes effective next month. Those are not the same timestamp.

---

# 15. Your query registry says it's versioned, but isn't

Documentation says query objects should contain `version`.

The TypeScript object doesn't.

Add:

```ts
version: number
```

because then you can measure:

```text
pricing-news-v1
yield 0.04

pricing-news-v2
yield 0.22
```

This makes your adaptive-search claim measurable.

---

# 16. One SerpApi documentation correction

Your docs say full Google News + `so=1` can be used as a generic newest-first query.

That's slightly wrong.

Current SerpApi docs say:

* `q` may use Google News operators such as `site:` and `when:`;
* `q` **cannot be used together with the Advanced Parameters**;
* `so=1` is an Advanced Parameter and is supported with token-based views such as `story_token` and `section_token`. ([SerpApi][2])

So don't implement:

```text
q=AI API pricing...
so=1
```

as your main current-news search.

Use something like:

```text
Google News Light
q="LLM API" pricing after:2026-08-29
```

or regular Google/date filtering depending on the query.

Then use:

```text
story_token + so=1
```

when investigating a specific story.

That brings us to the more interesting SerpApi features.

---

# The advanced SerpApi design I'd actually ship

There are **five** things I think genuinely elevate this beyond an ordinary search integration.

Not twenty APIs.

## A. Build a self-expanding radar from one Google Light search

This is a feature you haven't exploited yet.

Google Light can return organic results plus:

```text
Related Questions
Related Searches
Top Stories
Latest From
```

in the same SERP. ([SerpApi][3])

So one search:

```text
"Kimi API pricing"
```

can generate:

```text
organic results
      ↓
known/new sources

related questions
      ↓
things users care about

related searches
      ↓
future radar queries

top stories
      ↓
potential events

latest from
      ↓
new provider content
```

That's fantastic because it makes the query registry **self-expanding without another arbitrary LLM brainstorm**.

Persist:

```text
query_seed
query_expansion
expansion_source
parent_search_id
first_seen
yield
```

Then the UI can show:

```text
RADAR LEARNED A NEW QUERY

Seed:
"Kimi API pricing"

Google Related Question:
"Is Kimi API free?"

Added to candidate query pool.

Observed yield after 4 runs:
2 verified changes
```

This is a strong judge-facing use of structured SERP data.

---

# B. Use weird-name protection and recall controls

These are small parameters but technically thoughtful.

For obscure AI model names, Google autocorrect can be harmful.

Google Search/Light supports:

```text
nfpr=1
```

to exclude auto-corrected-query results where possible. ([SerpApi][6])

Use this for:

```text
MiMo
GLM-5
Kimi K2.x
Qwen3.x
provider-specific IDs
```

For discovery searches you can also experiment with:

```text
filter=0
```

which disables Google's similar/omitted-results filtering and increases recall. ([SerpApi][6])

Then **your own dedupe system** handles the duplicates.

That's a very elegant engineering story:

> Google normally removes redundancy for humans. LiveLLM deliberately retrieves higher-recall results and performs event-aware deduplication itself.

---

# C. Exploit Search Index much harder

This is one of the sponsor's newest and most relevant APIs.

SerpApi describes Search Index as its own **LLM-first web index**, currently around **3 billion indexed pages**, and `mode=deep` performs parallel sub-query decomposition for broader recall. ([SerpApi][5])

You've already put it in the registry.

Good.

Now make it first-class:

```text
EXPLOIT
Google News Light
known high-yield economics terms

EXPLORE
Search Index mode=deep
unknown providers/products/offers
```

Then evaluate:

```text
                 News Light   Search Index Deep

paid searches          20              5
new domains             3             27
candidates              4             14
verified events         3              4
false candidates         1             10
```

Now SerpApi isn't just a dependency.

You're empirically evaluating **which SerpApi retrieval surface works best for which discovery task**.

That will impress an engineering judge.

---

# D. Maximize information per search credit

SerpApi currently says only successful searches count, cached/errored/failed searches do not, and the number of results returned does not itself change the number of search credits—its FAQ explicitly gives 100 results vs an empty result as both one search. ([SerpApi][7])

Search Index supports a configurable `num`. ([SerpApi][5])

So benchmark:

```text
num=10
num=25
num=50
...
```

for:

```text
new useful domains/search
verified events/search
response time
false candidate rate
```

Don't just maximize results blindly—the standard Google docs warn bigger result requests may introduce latency and can affect specialized result types.

But for Search Index discovery, this could radically improve your 250-credit economics.

---

# E. Google News Full Coverage is perfect for event dedupe

Google News exposes `story_token`.

That gives you **Full Coverage** for a particular story. ([SerpApi][8])

Use it only after News Light identifies an important event:

```text
NEWS LIGHT
"Provider launches new API plan"
        ↓
high-value candidate
        ↓
FULL COVERAGE / story_token
        ↓
12 publications
        ↓
event cluster
        ↓
one CandidateEvent
```

Now you can calculate:

```text
coverage count
earliest publication
latest publication
sources agreeing
conflicting reports
official provider source located?
```

This solves your planned:

> four articles about one launch → one candidate

in a very SerpApi-native way.

And for `story_token` views, `so=1` legitimately gives date sorting. ([SerpApi][2])

---

# F. Search Archive should be your reproducibility system

You've correctly planned to save `search_metadata.id`.

Use it everywhere.

Search Archive can retrieve JSON or HTML from a search for up to **31 days**. ([SerpApi][9])

So every verified change can expose:

```text
Fact:
API input price changed to $0.25/M

Evidence:
official provider page

Discovery:
SerpApi search 68abc...

Query:
...

Engine:
google_news_light

Position:
#4

Detected:
...

Verified:
...
```

And:

```text
Replay this observation
```

can retrieve the exact archive while it exists.

Your fixture system then keeps the normalized/raw response permanently after Archive retention expires. That matches your existing fixture design.

---

# G. Make query scheduling actually learn

Your current scheduler uses:

```text
yield
× freshness
× commercial value
× staleness
÷ cost
```

That's already reasonable.

I would turn it into a lightweight Bayesian scheduler.

For each query:

```text
alpha = 1 + verified_useful_events
beta  = 3 + paid_runs - verified_useful_events
```

Sample expected yield from:

```text
Beta(alpha, beta)
```

Then:

```text
priority =
sampled_yield
× freshness_need
× commercial_value
× staleness
÷ estimated_cost
```

This gives exploration automatically.

Now you can genuinely say:

> **LiveLLM learns which search strategies produce valuable verified intelligence.**

Display:

```text
Query family             Estimated useful-event probability

AI API pricing news        32%
coding subscriptions       19%
free inference              8%
generic AI deals            2%
```

That's a stronger algorithmic feature than another page of search results.

---

# H. Google Trends can become economic-demand intelligence

This is where I would go beyond the current `livellm` spec.

Current SerpApi Trends supports:

* up to **five terms per call** for time series comparisons,
* hourly/day/week/etc windows,
* geographic breakdown,
* related topics,
* related queries,
* Web, News, Images, Shopping and YouTube properties. ([SerpApi][10])

So don't just calculate:

```text
model price
```

Calculate independent dimensions:

```text
Economic value       9.1
Demand momentum     +47%
News momentum       +81%
Regional interest    US / India / UK
```

Do **not** combine them into an opaque “magic score.”

Show them separately.

### Even better: use Trends Autocomplete for entity identity

Names such as:

```text
Claude
Gemini
Kimi
```

can be ambiguous.

Google Trends supports encoded Topics, and SerpApi's Trends Autocomplete API returns candidate topic IDs and types. ([SerpApi][11])

So:

```text
"Kimi"
   ↓
Trends Autocomplete
   ↓
correct AI-related entity/topic
   ↓
persistent topic ID
   ↓
cleaner demand history
```

That's much more defensible than blindly charting keyword counts.

---

# I. Related Trends queries can autonomously discover market demand

The Trends `RELATED_QUERIES` response separates:

```text
top
rising
```

and can return `Breakout` trends with numeric extracted growth. ([SerpApi][12])

That gives you:

```text
provider
   ↓
Trends related queries
   ↓
"provider API pricing"     +240%
"provider free API"        Breakout
"provider limits"          +90%
   ↓
new radar query candidates
```

This creates a second adaptive feedback loop:

```text
people start caring about something
          ↓
LiveLLM begins monitoring it
```

That's excellent.

---

# J. Google Trends Trending Now is another sensor

There is also now a dedicated **Trending Now API**.

It supports:

```text
4h
24h
48h
7d
only_active=true
category filters
geo
```

([SerpApi][13])

I wouldn't poll it constantly.

Instead:

```text
once/day
     ↓
any tracked model/provider suddenly trending?
     ↓
yes
     ↓
escalate News/Search discovery
```

And SerpApi has a separate Trends News API that can retrieve articles attached to one Trending Now topic using its `news_page_token`. ([SerpApi][14])

Very cool, but **P2**, not MVP.

---

# K. The killer feature: measure the AI freshness gap

This is the feature I now think can win the entry.

Don't frame LiveLLM merely as:

> live model prices.

Frame it as:

> **a live truth layer that measures how long AI and search take to catch up with a changing AI market.**

You already maintain canonical official-source facts.

Add:

```text
Google Search perception
Google AI Overview perception
Google AI Mode perception
```

Then compare each to the verified fact ledger.

Suppose:

```text
OFFICIAL PROVIDER
$0.25 / million tokens
updated 10:04

GOOGLE SEARCH SNIPPET
$0.40
still stale at 10:31

GOOGLE AI MODE
$0.40
still stale at 11:02
```

LiveLLM can calculate:

```text
Search freshness gap     >27m
AI answer freshness gap  >58m
```

That gives you a new object:

```text
TruthPropagationEvent
```

---

# L. Google AI Mode is perfect for that

SerpApi's current Google AI Mode API supports normal AI queries plus **multi-turn conversations**:

```text
continuable=true
```

returns:

```text
subsequent_request_token
```

which is then used for contextual follow-ups. ([SerpApi][15])

Do:

```text
Question:
"What is Provider X's current API price?"

AI Mode:
"$0.40..."

LiveLLM:
current official fact = $0.25
STALE
```

Then:

```text
Follow-up:
"Check whether that recently changed."

AI Mode:
...
```

Now you can measure whether additional live-search context causes the AI system to self-correct.

That is almost perfectly aligned with the sponsor's wording:

> demonstrate how giving AI access to live search data creates a more useful, accurate or impactful experience. ([DevNetwork Hackathon 2026][16])

---

# M. Google AI Overview gives you another comparison surface

Normal Google searches can expose an AI Overview directly or return a token requiring the separate AI Overview API.

That `page_token` expires in roughly **one minute**, so you have to follow it promptly. The response includes structured `text_blocks` and references. ([SerpApi][17])

Now LiveLLM can show:

```text
                 Verified fact    Search       AI Overview   AI Mode

price            $0.25            $0.25        $0.40 ❌       $0.25
free quota       1,000/day        1,000        50/day ❌      1,000
context limit    128K             128K         128K           128K
```

**AI freshness score: 67%.**

That's a memorable demo.

---

# N. Save the AI Mode/Overview search IDs too

Then the audit isn't:

> trust our screenshot.

It's:

```text
AI claim
   ↓
SerpApi search ID
   ↓
archived response
   ↓
claim extraction
   ↓
canonical official fact
   ↓
PASS / STALE / CONTRADICTED
```

That's the intersection of your provenance architecture and the coolest SerpApi APIs.

---

# O. Regional price/availability discovery

SerpApi's Locations API is free and returns canonical location names/IDs. ([SerpApi][18])

Use regional searches selectively:

```text
US
UK
Germany
India
Singapore
Japan
```

for products that appear to have regional plans.

Don't infer pricing truth from regional search results.

Instead:

```text
regional SERP discrepancy
       ↓
candidate
       ↓
regional official page
       ↓
verified regional fact
```

Then LiveLLM can represent:

```text
provider_plan.price
country = IN
currency = INR
```

That is legitimate intelligence.

---

# P. JSON Restrictor + Markdown should be visible engineering

JSON Restrictor works across SerpApi engines and allows field-level response reduction. ([SerpApi][19])

Your deterministic discovery stage might request only:

```text
search_metadata.id
organic_results[].position
organic_results[].title
organic_results[].link
organic_results[].snippet
```

Then:

```text
cheap deterministic filter
          ↓
interesting candidate only
          ↓
Markdown representation
          ↓
AI classifier
```

Record:

```text
Full JSON bytes
Restricted JSON bytes
Markdown tokens
LLM calls avoided
Estimated LLM input cost avoided
```

This turns an invisible optimization into something judges see.

---

# P+1: one weird SerpApi feature worth knowing about

SerpApi has a **Pixel Position API** that can add actual rendered browser coordinates for SERP elements, including archived searches. ([SerpApi][20])

I would **not** build this before everything else.

But if the project is finished, you could measure:

```text
official provider page rank       #3
pixel position                    782 px
AI Overview occupied              first 611 px
```

Then calculate whether stale AI answers visually dominate current official sources.

That's an extremely unusual “search perception vs truth” research feature.

P3 only—but very distinctive.

---

# Architecture I recommend now

```text
                         LIVE LLM

                  ┌────────────────────┐
                  │   SERPAPI RADAR    │
                  └─────────┬──────────┘
                            │
     ┌──────────────────────┼─────────────────────────┐
     │                      │                         │
 Google Light         News / Full Coverage     Search Index Deep
     │                      │                         │
 sources / PAA         emerging events          unknown unknowns
     │                      │                         │
     └──────────────────────┴─────────────────────────┘
                            │
                      CANDIDATE EVENT
                            │
                            ▼
                   OFFICIAL SOURCE FETCH
                            │
                            ▼
                      AI EXTRACTION
                            │
                            ▼
                 DETERMINISTIC VALIDATION
                            │
                            ▼
                       FACT LEDGER
                            │
               ┌────────────┴─────────────┐
               ▼                          ▼
          ECONOMIC ENGINE            CHANGE FEED
               │
               ▼
          CURRENT MARKET
```

Then two extra intelligence planes:

```text
Google Trends
     ↓
DEMAND / MOMENTUM
```

and:

```text
AI Overview + AI Mode
         ↓
AI PERCEPTION
         ↓
compare against FACT LEDGER
         ↓
AI FRESHNESS / STALENESS
```

That's a cohesive product rather than an API collection.

---

# Exact development plan

## CP0 — Make the repo runnable

Add:

```text
package.json
package-lock.json
tsconfig.json
.gitignore
LICENSE
src/cli.ts
```

Scripts:

```text
npm run build
npm test
npm run radar
npm run record
npm run replay
npm run demo
```

Add `.gitignore` immediately because you already expect a real API secret but currently don't have one.

Ignore at least:

```text
.env
*.db
node_modules/
dist/
coverage/
```

---

# CP1 — Harden `SerpApiProvider`

Refactor:

```text
src/search/serpapi.ts
```

into:

```text
serpapi-client.ts
serpapi-json.ts
archive.ts
account.ts
```

Implement:

* abort timeout;
* retries for appropriate transient failures;
* `search_metadata.status`;
* `search_metadata.id`;
* created/processed timestamps;
* latency;
* content-type;
* News source-object normalization;
* `iso_date`;
* explicit freshness policy;
* reject unsupported async;
* JSON and Markdown separately.

Tests for every one.

---

# CP2 — Actually wire SQLite

Implement:

```text
db/open.ts
db/migrate.ts
db/search-runs.ts
db/cache.ts
```

Then make:

```ts
SqliteCacheStore implements CacheStore
```

Your migration already gives you most tables.

---

# CP3 — Record real fixtures

Spend perhaps **5–10 deliberate searches**, not 100.

Capture:

```text
Google Light
Google News Light
Google News full
Search Index
Search Index deep
zero-result
```

Keep:

```text
raw response
normalized response
search ID
canonical request
timestamp
```

Then immediately get the entire test suite running against replay.

---

# CP4 — Implement the test plan you already wrote

Convert every item in `TEST-PLAN.md` into executable tests.

Especially:

```text
canonical request
cache
singleflight
URL normalization
candidate scoring
candidate dedupe
304 handling
fact supersession
quota reserve
replay
```

Add CI.

At that point GitHub visibly shows green checks.

---

# CP5 — Build the end-to-end vertical slice

This is the most important milestone.

One command:

```bash
npm run radar
```

must execute:

```text
Account API
↓
select one due query
↓
SerpApi
↓
SearchRun DB row
↓
SearchResults
↓
prefilter
↓
Candidate
↓
official source
↓
fact extraction
↓
verification
↓
ChangeEvent
```

Nothing else matters until this works.

---

# CP6 — Add AI structured extraction

Feed only the official page's relevant section.

Expected output:

```json
{
  "claims": [
    {
      "field": "input_price_usd_per_million",
      "value": 0.25,
      "unit": "USD/1M tokens",
      "quote": "...",
      "confidence": 0.97
    }
  ]
}
```

The AI proposes.

Deterministic code checks:

```text
schema
type
unit
currency
range
source authority
evidence quote
previous fact
```

Then applies facts.

---

# CP7 — Connect back to LLMDeals

Do not finish with two confusing hackathon repositories.

Ultimately:

```text
LiveLLM truth engine
        ↓
materialized current state
        ↓
existing LLMDeals economics
        ↓
existing pages/API/MCP
```

Your migration document already proposes keeping the existing Astro JSON format as the materialized current view.

That's exactly what I'd do.

---

# CP8 — Implement the Live Radar screen

Show the pipeline itself:

```text
LIVE RADAR

Search                    1
Raw results              14
Known URLs                8
New URLs                  6
Candidates                3
AI investigated           2
Official sources found    2
Verified changes          1

Verified yield          1.00
Quota remaining          219
```

You already specced basically this visual.

Make it real.

---

# CP9 — Search Archive provenance

Every candidate/change opens a provenance drawer:

```text
Discovery
SerpApi engine
Query
Search ID
Position
Observed time

Verification
Official URL
Evidence quote
Fact

Impact
Before
After
Affected derivations
```

This alone will make the project look extremely polished.

---

# CP10 — Search Index Deep evaluation

Build the first comparative experiment:

```text
News Light vs Google Light vs Search Index Deep
```

Measure:

```text
verified changes / search
new domains / search
false-positive rate
median latency
```

Don't merely say Search Index is useful.

**Prove it.**

---

# CP11 — Self-expanding radar

Consume:

```text
related_questions
related_searches
latest_from
top_stories
```

from Google Light.

Generate query candidates.

Promote them only after validation/yield tests.

Now the radar learns.

---

# CP12 — Trends intelligence

Add engines:

```text
google_trends
google_trends_autocomplete
```

Start with only:

```text
5-model comparative time series
RELATED_QUERIES
```

Create:

```text
Demand Momentum
```

beside economic value.

---

# CP13 — AI Truth Auditor

This is the final feature I'd target before submission.

Add:

```text
google_ai_mode
google_ai_overview
```

Create a small benchmark set:

```text
20 live factual AI-market questions
```

For each:

```text
AI claim
verified fact
match/mismatch
age of current fact
AI source references
SerpApi search ID
```

Report:

```text
AI Freshness Score

17 / 20 claims current
2 stale
1 unsupported

85%
```

Then show one live example in the demo.

---

# CP14 — Full Coverage story clustering

Only now add:

```text
story_token
```

for material announcements.

Use it for cross-source corroboration and candidate deduplication.

---

# CP15 — Adaptive query scheduler

Once you have enough fixture/live runs, replace the hand-set heuristic yield estimate with the Bayesian scheduler.

Until you have observations, don't pretend the learning system learned anything.

---

# CP16 — Deployment hardening

For the public deployment:

```text
scheduled radar
→ backend only

site visitors
→ read cached verified state
```

**Do not expose an unrestricted public button that spends SerpApi credits.**

For the demo, either:

* authenticated live trigger, or
* local CLI live trigger, or
* replay button on public site.

---

# CP17 — Judge-facing evaluation

Produce one page:

## Why SerpApi matters

Run an ablation.

### A — Known source watcher only

```text
unknown provider recall        low
new announcement detection     low
```

### B — generic browser research agent

```text
browser calls                 high
LLM calls                     high
latency                       high
```

### C — LiveLLM + SerpApi radar

```text
unknown-event recall          high
browser escalation            low
LLM calls                     selective
search provenance             available
```

Your own demo spec already proposes this evaluation direction.

Actually produce the numbers.

---

# CP18 — README and commit history

The DevNetwork judging criteria also include **Progress, Concept and Feasibility**. ([DevNetwork Hackathon 2026][21])

Right now the repo has one giant initial commit.

Don't rewrite fake history.

From now on make coherent commits:

```text
feat: runnable radar CLI + sqlite
test: deterministic record/replay suite
feat: live discovery candidate pipeline
feat: official-source fact verification
feat: SerpApi archive provenance
feat: Search Index deep exploration
feat: Trends demand momentum
feat: AI Mode freshness auditor
feat: judge dashboard
```

That visibly demonstrates hackathon progress.

---

# What I would cut

Do **not** spend the remaining time on:

* generic vector search,
* huge agent framework,
* new frontend stack,
* distributed job queues,
* dozens of providers before one works,
* Kubernetes,
* custom browser infrastructure,
* 50 SerpApi engines,
* elaborate embeddings.

Your current stop-condition document is right on this.

---

# Priority order if you want the strongest entry

If I were driving development from this exact commit:

### Must work

1. Runnable Node project.
2. `.gitignore` + secret hygiene.
3. Real SQLite implementation.
4. SerpApi client hardening.
5. Real fixtures.
6. Executable tests + CI.
7. One complete discovery → official source → AI extraction → fact → change flow.
8. LLMDeals economics materialization.
9. Live Radar UI.
10. Search Archive provenance.

### Then differentiation

11. Search Index deep + comparative evaluation.
12. Google Light self-expanding queries.
13. JSON Restrictor/Markdown efficiency metrics.
14. Trends + Trends topic identity.
15. AI Mode/AI Overview truth auditor.

### Only if everything above works

16. News Full Coverage clustering.
17. Bayesian adaptive query scheduling.
18. regional market discrepancies.
19. Trending Now.
20. Pixel-position “what stale AI visually displaced” experiment.

---

# The product I would submit

Not:

> **LLMDeals × SerpApi Integration Kit**

And not even merely:

> AI deals website.

I'd submit:

## **LiveLLM**

**The live truth and market-intelligence layer for AI.**

Core proposition:

> AI models, API prices, free tiers and limits change faster than static AI knowledge can keep up. LiveLLM discovers market changes through SerpApi, verifies them against official sources, calculates their real economic impact, and measures when search and AI answers have gone stale.

Then the four product surfaces are obvious:

```text
LIVE MARKET
What is true now?

LIVE RADAR
What just changed?

MARKET MOMENTUM
What is becoming important?

AI TRUTH
What does AI currently get wrong?
```

That makes Google Light, News, Search Index, Trends, Search Archive, AI Overview and AI Mode **different sensors inside one coherent intelligence system**, rather than APIs added to impress a sponsor.

That is the version of this project I think could be legitimately memorable among the SerpApi submissions. The deadline is **September 3, 2026 at 10:00 AM PDT**, so the correct move is to get CP0–CP10 completely functional before adding the exotic surfaces. ([DevNetwork Hackathon 2026][22])

Because SerpApi is still releasing/fixing features during the hackathon—its Google Search release notes include fixes as recently as **August 26, 2026**—I can also monitor their release notes until the deadline and flag anything newly useful for LiveLLM. ([SerpApi][23])

[1]: https://api-cloud-ai-hackathon-2026.devpost.com/?ref_feature=challenge&ref_medium=discover&utm_source=chatgpt.com "DevNetwork [API + Cloud + AI] Hackathon 2026: Join the nation's largest challenge-driven API + Cloud + AI hackathon @ API World 2026! - Devpost"
[2]: https://v13.serpapi.com/google-news-api "Google News API - SerpApi"
[3]: https://serpapi.com/google-light-api?utm_source=chatgpt.com "Google Light Search API - SerpApi"
[4]: https://serpapi.com/markdown-output?utm_source=chatgpt.com "SerpApi: Markdown Output for AI Agents"
[5]: https://serpapi.com/search-index-api?utm_source=chatgpt.com "Search Index - SerpApi"
[6]: https://serpapi.com/search-api?utm_source=chatgpt.com "Google Search Engine Results API - SerpApi"
[7]: https://serpapi.com/pricing?utm_source=chatgpt.com "SerpApi: Plans and Pricing"
[8]: https://v13.serpapi.com/google-news-api?utm_source=chatgpt.com "Google News API - SerpApi"
[9]: https://serpapi.com/search-archive-api?utm_source=chatgpt.com "Search Archive API - SerpApi"
[10]: https://serpapi.com/google-trends-api?utm_source=chatgpt.com "Google Trends API - SerpApi"
[11]: https://serpapi.com/google-trends-autocomplete?utm_source=chatgpt.com "Google Trends Autocomplete API - SerpApi"
[12]: https://serpapi.com/google-trends-related-queries?utm_source=chatgpt.com "Google Trends Related Queries API - SerpApi"
[13]: https://us-west.serpapi.com/google-trends-trending-now?utm_source=chatgpt.com "Google Trends Trending Now API - SerpApi"
[14]: https://serpapi.com/google-trends-news?utm_source=chatgpt.com "Google Trends News API - SerpApi"
[15]: https://serpapi.com/google-ai-mode-api?utm_source=chatgpt.com "Google AI Mode API - SerpApi"
[16]: https://api-cloud-ai-hackathon-2026.devpost.com/updates "DevNetwork [API + Cloud + AI] Hackathon 2026: Join the nation's largest challenge-driven API + Cloud + AI hackathon @ API World 2026! - Devpost"
[17]: https://serpapi.com/google-ai-overview-api?utm_source=chatgpt.com "Google AI Overview API - SerpApi"
[18]: https://serpapi.com/locations-api?utm_source=chatgpt.com "Supported Locations API - SerpApi"
[19]: https://serpapi.com/json-restrictor?utm_source=chatgpt.com "SerpApi: JSON Restrictor"
[20]: https://serpapi.com/pixel-position-api?utm_source=chatgpt.com "Pixel Position - SerpApi"
[21]: https://api-cloud-ai-hackathon-2026.devpost.com/?ref_content=in-person-hackathons&ref_feature=challenge&ref_medium=artificial-intelligence-channel&utm_source=chatgpt.com "DevNetwork [API + Cloud + AI] Hackathon 2026: Join the nation's largest challenge-driven API + Cloud + AI hackathon @ API World 2026! - Devpost"
[22]: https://api-cloud-ai-hackathon-2026.devpost.com/details/dates?utm_source=chatgpt.com "DevNetwork [API + Cloud + AI] Hackathon 2026: Join the nation's largest challenge-driven API + Cloud + AI hackathon @ API World 2026! - Devpost"
[23]: https://serpapi.com/search-api/release-notes?utm_source=chatgpt.com "Last Release Notes: Google Search API - SerpApi"
