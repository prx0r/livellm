# LiveLLM Pitch Plan — 2026-08-31

## The Pitch

**Headline:** LiveLLM — verified market data for autonomous AI agents

**Not:** "live pricing for LLMs" (Google finds 10 competitors)

**The story:** Economic oracle that tells agents WHAT changed, WHERE it came from, WHEN it was observed, and WHETHER they can trust it.

## What exists already

### Core pipeline (working)
```
SerpApi Discovery → Candidates → Official Sources → AI Extraction → Facts → Economics
```

### HTTP API (7 endpoints)
```
GET  /v1/market              — compact market snapshot (23 models)
GET  /v1/market?models=X     — filter to specific models
GET  /v1/economics/:model    — pricing facts + cost-per-1K
GET  /v1/models/:model       — detailed facts with evidence IDs
GET  /v1/changes             — recent market changes
GET  /v1/evidence/:id        — full provenance bundle
GET  /v1/health              — health check
```

### CLI commands (all working)
```bash
npm run radar          # Run discovery cycle (4 queries, ~8 credits)
npm run official       # Targeted official-source searches (4 queries)
npm run daily          # Full daily cycle
npm run economics      # Calculate value metrics
npm run md             # Generate Markdown for agents
npm run mcp            # Start MCP server (read-only)
npm run serve          # Start HTTP API server
npm run glm-demo       # GLM-5.3-Flash promotion demo
```

### Economics (working)
- 9 models tracked with provider-specific workloads
- PAYG vs subscription split
- Promotion multiplier support
- Reconciliation detection

### SerpApi integration
- News Light, Google Light, Search Index Deep
- JSON Restrictor on all queries
- Account API quota governance
- Search Archive IDs as provenance

## What to add

### 1. CloudPrice as ingestion source
- Scrape their daily JSON (~800 models)
- Verify against official sources via SerpApi
- Detect when CloudPrice misses promotions
- Use as cross-validation signal

### 2. Agent workload economics
- Cost-per-task calculations using real pricing
- "If agent uses Claude for 1000 tasks/day, what's the optimal model?"
- Promotion arbitrage: "GLM flash is free until Sept 9, use it now"

### 3. Demo polish
- Record the GLM promotion flow
- Show 3 agents making different decisions
- Dashboard with live market snapshot

### 4. Submission materials
- README with architecture diagram
- 2-3 minute demo video
- SerpApi integration depth documentation
- Impact statement

## Files to check
- `/root/livellm/` — main repo
- `/root/livellm/DEV-PLAN.md` — detailed improvement plan
- `/root/livellm/HANDOVER-2026-08-30.md` — current state
- `/root/livellm/src/` — source code
- `/root/livellm/tests/` — test suite

## Next steps
1. Review current test failures
2. Fix the 2 failing tests
3. Build the GLM replay demo
4. Polish the dashboard
5. Write the pitch document
6. Submit
