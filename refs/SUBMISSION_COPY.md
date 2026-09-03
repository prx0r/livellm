# DevNetwork submission copy

Copy/paste source for the three submissions.

---

# LiveLLM — SerpApi

## Project name

**LiveLLM**

## One-line pitch

**LiveLLM gives AI agents verified, current model economics: SerpApi discovers changing prices, quotas and promotions, then LiveLLM validates the official source and serves the resulting state through an API and MCP.**

## Short description

AI agents increasingly choose between models, providers, subscriptions, and fallback capacity, but the economic facts behind those choices change faster than model memory. LiveLLM turns that changing web state into a verified, machine-readable market feed.

The demo starts with an agent making a rational decision from stale capacity information. LiveLLM performs a fresh SerpApi search, resolves the provider's official source, extracts and deterministically validates the changed fact, and reruns the same decision. The agent changes its route because the market state changed.

## Where SerpApi does the heavy lifting

**SerpApi is LiveLLM's discovery and provenance layer: it finds changing model economics in real time, resolves the official source, and gives each discovery a replayable search ID before LiveLLM validates and serves the resulting fact.**

## Why it matters

Search gives an agent documents. LiveLLM gives it decision-ready economic state with evidence, timestamps, change history, and provenance.

## Demo closing line

**Agents already pay for models. LiveLLM makes the economics they reason over live.**

## Commercial path

The existing API/MCP surface is a natural machine-to-machine data product. An x402 payment boundary could monetize individual fresh facts or market queries without changing the underlying product; current payment enforcement should be described as future work unless it is actually deployed.

---

# ProofDesk — Nutrient

## Project name

**ProofDesk**

## One-line pitch

**ProofDesk is an authority layer for document agents: Nutrient DWS grounds what the documents say, and ProofDesk blocks action until the evidence is consistent and, when necessary, resolved by a human.**

## Short description

High-confidence document extraction is not the same thing as permission to act.

In the canonical procurement case, one document requires insurance through October while another shows coverage expiring in August. Nutrient DWS can read both values correctly. ProofDesk turns those grounded facts into deterministic cross-document assertions, blocks execution on the contradiction, lets a human inspect the source evidence and record a resolution, and binds the approved state to an auditable record.

## Where Nutrient DWS does the heavy lifting

**Nutrient DWS turns the source PDFs into structured evidence with confidence and source citations; ProofDesk cross-checks that evidence and withholds authority when the documents disagree.**

## Why it matters

As agents move from reading documents to approving purchases, releasing payments, filing claims, and executing contracts, organizations need a deterministic authority boundary between probabilistic understanding and irreversible action.

## Demo closing line

**Nutrient turns PDFs into grounded evidence. ProofDesk turns grounded evidence into accountable authority.**

---

# DomainArena — name.com

## Project name

**DomainArena**

## One-line pitch

**DomainArena A/B tests domain names on an audience that increasingly matters—AI agents—then uses name.com to turn the evidence-backed recommendation into an approval-gated registration and DNS workflow.**

## Short description

A domain that feels clear and memorable to a human can be semantically opaque to an AI agent. DomainArena measures that before purchase.

The system starts with a fixed product intent, discovers available candidates through name.com, blind-tests what agents think each name represents, ranks the evidence, requires human approval, then closes the loop through registration, DNS creation, and DNS read-back.

## Where name.com does the heavy lifting

**name.com supplies the live domain inventory, availability and pricing that DomainArena can evaluate, then closes the loop with registration, DNS creation and DNS read-back; without name.com, the system can measure names but cannot ship the decision.**

## Why it matters

Companies already optimize names for human recall and search. DomainArena adds a new measurable dimension for an agentic web: **machine legibility**.

## Demo closing line

**DomainArena turns domain naming from taste into a measurable deployment decision.**
