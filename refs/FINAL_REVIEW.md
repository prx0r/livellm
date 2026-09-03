# Final judge review — DevNetwork API + Cloud + AI Hackathon

## Executive verdict

These are not three variations of the same hackathon wrapper. They attack three different missing primitives for agents:

| Entry | Primitive | Sponsor | Current judge view |
|---|---|---|---|
| LiveLLM | live economic truth | SerpApi | strongest finished API/startup surface |
| ProofDesk | evidence → authority | Nutrient | strongest core concept; presentation/strict-mode cleanup is decisive |
| DomainArena | machine-legible identity + controlled actuation | name.com | strongest multi-endpoint sponsor integration; clean-checkout CI must be fixed |

The unusual strength across all three is that the sponsor API is not just used to produce a screenshot. Each project exposes or builds toward an actual reusable machine interface.

That is a better hackathon story than “we put an LLM in front of an API.”

---

# 1. LiveLLM

## Judge score now

**~9.0/10 — winner shortlist**

### Why I would consider it a winner

1. **The SerpApi dependency is causal.** Remove live discovery and the product becomes a stale manually maintained data table.
2. **The demo has a real behavioral consequence.** The same agent changes its route because a verified market fact changed.
3. **It is already infrastructure-shaped.** HTTP API, MCP, evidence history, temporal facts, replay tests.
4. **It has a believable customer.** Agents and routing systems repeatedly need compact model-economics state.
5. **It has a natural monetization boundary.** A narrow market-state response is the kind of object that can later sit behind a per-call payment rail such as x402.

### Why I might not give it first place as-is

- the README's current test count is stale by one;
- the repository contains a stale/broken gitlink;
- the existing PITCH.md is too long and reads more like a research/deck document than a judge-facing pitch;
- the Worker demo advertises the broader API surface even though the Worker route itself is primarily the demo;
- x402 payment enforcement is not yet shipped and must remain labelled future.

## Winner framing

Do not sell “LLM pricing search.”

Sell:

> **verified live economic state for agents**

The striking thing is not that SerpApi finds a page. It is that a search result is converted into a provenance-bearing fact that changes a downstream machine decision.

---

# 2. ProofDesk

## Judge score now

**~8.2/10 public surface; ~9.7/10 concept if the P0 cleanup lands**

### Why I would consider it a winner

1. **It maps almost perfectly to the Nutrient challenge philosophy.** Extraction feeds confidence/source evidence, deterministic checks, human judgment, and an audit record.
2. **The core insight is excellent.** Two high-confidence facts can still jointly imply that an action is unsafe.
3. **The sponsor boundary is clean.** Nutrient acquires document truth; ProofDesk decides whether that truth is sufficient for authority.
4. **The workflow generalizes far beyond the fixture.** Procurement, claims, payments, filings, contracts, account changes.
5. **Auditability is part of execution rather than a decorative log panel.**

### Why I would not give the current public version first place without changes

The dedicated demo still tells the old Foxit/signing story. That is a large sponsor-story mismatch for a Nutrient-only submission.

More importantly, strict live semantics do not yet fully match the authority thesis: one required Nutrient extraction can fail and the orchestration can continue with a reduced fact set. For an authority system, missing required evidence should withhold authority.

The product idea is stronger than the current demo surface.

## Winner framing

Do not sell:

> AI document processing

or:

> AI signing

Sell:

> **Document understanding is not document authority.**

The demo should make one contradiction visually unavoidable:

```text
Required insurance through October
Certificate expires in August
Both extracted correctly
→ BLOCKED
```

That is the project.

---

# 3. DomainArena

## Judge score now

**~7.8/10 while CI is red; ~9.5/10 after the clean-checkout fix and repo cleanup**

### Why I would consider it a winner

1. **Excellent sponsor depth.** Search, availability/pricing, registration, DNS creation, and DNS read-back form an actual lifecycle.
2. **Original thesis.** “Test a domain on the machine audience before buying it” is memorable and relevant to an agentic web.
3. **The integration closes the loop.** It does not stop at recommending a name; name.com is what lets the system act on the decision.
4. **The authority boundary is sensible.** Measurement and recommendation are separate from permission to spend money.
5. **It has a plausible standalone business.** Machine legibility can become another optimization axis alongside recall, SEO, and brand.

### Why I would not award the current checkout first place

The current public CI is red before tests can run because a test imports a missing `cogym_kernel` module. A judge cloning the repository therefore cannot reproduce the README's “148 tests passing” claim.

There is also:
- a broken `RESEARCH.md` link;
- stale/wrong-project planning material in the root;
- a protected registration API that the public UI does not currently provide an approval header for;
- a Worker adapter still targeting name.com's legacy v4 API while CORE v1 is the current generation.

The first three are presentation/reproducibility issues and should be fixed now. The API-version migration is not worth risking a working submission unless it is trivial and fully tested.

## Winner framing

Do not resurrect the older generic AgentSEO framing.

Sell:

> **A/B testing for domain names in the agentic web.**

The surprising result is the hook: a name humans prefer can be less legible to an agent.

Then name.com turns the measured winner into a controlled deployment.

---

# What winning hackathon repositories tend to do

The strongest reference repositories share a simple structure:

1. **One sentence at the top.**
2. **A live demo or demo video immediately visible.**
3. **One concrete user story/problem.**
4. **A small architecture diagram.**
5. **Fast reproducible setup.**
6. **Proof: tests, screenshots, receipts, output examples.**
7. **A clear line between “built” and “next.”**

They do not force the judge to read a thesis before understanding what happened.

For these three repos, the first screen should therefore answer:

```text
What is it?
Why does this sponsor API matter?
What happens in the demo?
Can I run it?
What is actually shipped?
```

Everything else is secondary.

---

# Portfolio-level observation

The three projects accidentally form a coherent agent infrastructure stack:

```text
LiveLLM
What is true right now economically?

ProofDesk
Is the evidence sufficient to permit action?

DomainArena
How should an agent-facing identity be selected and deployed?
```

That coherence is useful as a founder narrative, but do **not** make the individual hackathon entries depend on each other. Each sponsor judge should be able to understand and score their project independently.

---

# Final priority order

If there is very little time left:

## First 30–60 minutes

1. Fix DomainArena CI import and get public Actions green.
2. Replace/add the three PITCH.md files.
3. Remove DomainArena broken link and wrong-project root plan.
4. Fix LiveLLM 77 → 76 test count.
5. Confirm the old ProofDesk Nutrient key was revoked.

## Next

6. Make ProofDesk's canonical demo Nutrient-only and rename the gate to Authority Gate.
7. Enforce strict live/evidence-complete behavior for the controlled ProofDesk case.
8. Remove/clean stale gitlinks.
9. Record each demo in one uninterrupted 2–3 minute path.

## Do not do

- new providers;
- new benchmark families;
- new dashboards;
- new model integrations;
- a last-minute full API migration that threatens the name.com demo;
- a real x402 integration unless every P0 item is already done.

The projects are feature-complete enough. The remaining work is mostly **judge trust, reproducibility, and compression**.
