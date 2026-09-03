# Final pre-submission patch list

This is ordered by **judge-risk**, not by engineering elegance. Do not add features until the P0 items are finished.

---

# 1. DomainArena (`prx0r/agentseolab`) — P0

## Fix the clean-checkout CI failure

Current GitHub Actions fails during test collection because:

```python
from cogym_kernel.kernel.contracts import ActionSpec, ActionResult
```

is not importable in a clean checkout.

`domainarena/world.py` already uses the self-contained contract module.

Change `tests/domainarena/test_world.py` to:

```diff
- from cogym_kernel.kernel.contracts import ActionSpec, ActionResult
+ from domainarena.worldpack.contracts import ActionSpec, ActionResult
```

Then run:

```bash
pytest -q
```

Do not claim “148 tests passing” until the public Actions run is green. Replace the count with the real CI result after the fix.

## Remove the broken research link

The README links to `RESEARCH.md`, but that file is absent.

Fastest safe fix:

```diff
- - [`RESEARCH.md`](RESEARCH.md) — ...
```

or create the file only if there is already canonical research material to put there. Do not invent another document just for symmetry.

## Clean the root

The current root contains old planning material, including a ProofDesk final-plan file inside the DomainArena repository.

Move planning artifacts under something like:

```text
archive/plans/
```

or remove them if they are already superseded.

A judge should see:

```text
README.md
PITCH.md
DEMO.md
domainarena/
worker/
tests/
...
```

not development archaeology.

## Make the recorded purchase lifecycle truthful

The Worker protects `/api/register` and DNS writes with `X-Approval-Code`, but the public UI does not currently send that secret.

That is a good safety boundary, but it means the browser demo cannot silently claim it completed registration.

For the recorded demo, use one of these:

1. add a temporary/manual approval input that sends the header without hard-coding the value; or
2. show the approval-gated write from a terminal/curl step while keeping the secret off-screen.

Do not weaken the gate simply to make the video easier.

## name.com API version

The current Worker targets name.com v4. name.com's current documentation identifies CORE v1 as the latest API generation and v4 as legacy/sunsetting.

**Do not perform a last-minute migration if it risks breaking a working demo.**

Before submission:
- keep the current working lifecycle;
- avoid claiming it is using the newest API generation.

After submission / only if trivial and fully tested:
- migrate search/availability/pricing/register/DNS calls to CORE v1;
- follow the current checkout pattern, including a fresh availability check immediately before registration and an idempotency key for the write.

---

# 2. ProofDesk — P0

## Confirm the previously exposed Nutrient key was revoked/rotated

An earlier repo review found a live Nutrient key committed in `scripts/deploy.sh`.

Deleting it from the latest file is not enough.

Before submission confirm:

- old credential revoked/rotated;
- current secret exists only in deployment configuration;
- current tree contains no `pdf_live_` / `pdf_test_` key values;
- no demo/log prints the credential.

## Do not record the old Foxit `/demo`

The current dedicated demo page still tells the old story:

- `SignatureGate`;
- Foxit PDF Services;
- simulated Foxit eSign.

For a Nutrient-only entry, that is a major judging mismatch.

Canonical demo language should be:

```text
ProofDesk
Document understanding is not document authority.

Nutrient DWS → Grounded Evidence
ProofDesk → Cross-document checks
Authority Gate → BLOCKED / REVIEW / APPROVABLE
Human → explicit resolution
Audit → record + hashes
```

Historical Foxit code can remain in the repository if removing it risks breakage. It simply should not be the sponsor-facing surface.

## Enforce strict live semantics

`DEMO_REQUIRE_LIVE_PROVIDERS=true` should mean exactly that.

In strict demo mode:

```text
no Nutrient credential       → fail / authority withheld
required PDF has no raw bytes → fail / authority withheld
Nutrient request error        → fail / authority withheld
required doc yields no facts  → fail / authority withheld
malformed extraction          → fail / authority withheld
```

Do not silently substitute a fixture/stub when the judge is being told the run is live.

## Add evidence completeness

Current orchestration can continue if one document's Nutrient extraction fails as long as other facts exist.

For an authority system, that can be unsafe.

Track something like:

```json
{
  "required_documents": 4,
  "processed_live": 4,
  "failed": 0,
  "required_evidence_complete": true
}
```

If a required document fails:

```text
EVIDENCE INCOMPLETE
AUTHORITY WITHHELD
```

The key principle:

> Absence of contradictory evidence is not evidence of consistency.

## Tighten provider status language

Current provider status can display `LIVE` based on the presence of `NUTRIENT_API_KEY`.

Prefer:

```text
CONFIGURED
LIVE — LAST RUN VERIFIED
UNAVAILABLE
```

or only use `LIVE` after a successful real call in the current case.

## Remove stale test counts

The latest CI is green across six suites. Use:

> “Six CI suites green.”

Do not keep historical exact counts unless they match the current run.

## Clean the dangling gitlink

GitHub Actions cleanup reports a stale gitlink under:

```text
imported/factjudge/telegraph-lab/factjudge
```

Inspect it with:

```bash
git ls-files -s imported/factjudge/telegraph-lab/factjudge
```

If mode is `160000` and the submodule is no longer intentional, remove it cleanly rather than leaving a broken submodule reference.

---

# 3. LiveLLM — P0/P1

## Fix the README test count

Current clean CI:

```text
76 passed
0 failed
0 skipped
```

Change the README from `77 tests` to `76 tests`.

## Replace the current long PITCH.md

The existing pitch reads like an extended deck/research memo. Use the provided `livellm/PITCH.md` instead.

The judge should understand the product in the first 15 seconds:

> Live economic state for AI agents.

## Be exact about the deployed surface

The Cloudflare Worker demo proves the SerpApi → official source → validation → reroute flow.

The full HTTP API is implemented in the repository's application server.

Do not imply that every advertised `/v1/...` endpoint is necessarily served by the Worker itself unless you have deployed that server publicly.

Two safe options:

1. deploy the full API and link it; or
2. label the Worker as **Live Demo** and the API as **Implemented API — run locally / deployable**.

Truthful beats impressive-looking ambiguity.

## Keep x402 as the commercialization path, not a shipped claim

The current UI itself calls the x402 pricing manifest “future.”

Pitch:

> “The API is already narrow and machine-readable enough to sit behind x402; payment enforcement is the next boundary.”

Do not pitch:

> “LiveLLM is already a paid x402 service.”

unless you actually enforce and settle payments.

## Clean the dangling `refs/agentdeals` gitlink

Actions cleanup reports:

```text
No url found for submodule path 'refs/agentdeals' in .gitmodules
```

Inspect:

```bash
git ls-files -s refs/agentdeals
```

If it is an obsolete `160000` gitlink:

```bash
git rm --cached refs/agentdeals
```

and remove/archive the stale worktree content as appropriate.

---

# Freeze rule

Once these are true, stop coding:

```text
[ ] all three public repos have a concise PITCH.md
[ ] all three READMEs have truthful current claims
[ ] LiveLLM public CI green
[ ] ProofDesk public CI green
[ ] DomainArena public CI green
[ ] no broken README links
[ ] no stale wrong-project plan files in root
[ ] no sponsor-confusing canonical demo
[ ] every “LIVE” badge corresponds to a real live operation
[ ] each recorded demo completes in under 3 minutes
[ ] each entry has one sentence explaining exactly what the sponsor API does
[ ] future functionality is clearly labelled future
```

Do not spend the remaining window adding providers, models, dashboards, benchmarks, or speculative features.
