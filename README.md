# LiveLLM

**Verified live market intelligence for AI agents.**

> AI model prices, quotas and promotions change faster than static datasets and model knowledge can keep up. LiveLLM uses SerpApi to discover market changes, verifies them against authoritative sources, converts them into versioned facts, and calculates how those changes affect real workloads.

## Quick Start

```bash
npm ci
npm run build
npm test
npm run demo
```

## Architecture

```
SerpApi Discovery → Candidates → Official Sources → AI Extraction → Facts → Economics
     ↓              ↓              ↓                ↓            ↓          ↓
  Search IDs    Prefilter     Verification    Deterministic   Ledger   Provider Workloads
                                                     ↑
                                                Validation
```

## SerpApi Integration

| API | Role |
|-----|------|
| Google News Light | Emerging announcements |
| Google Light | Official-source discovery |
| Search Index Deep | Unknown providers/offers |
| Account API | Quota governance |
| JSON Restrictor | Efficient structured acquisition |

## Demo: GLM-5.3-Flash Promotion

```
GLM-5.3-Flash — Two promotions detected:

Z.ai: 50% off ($0.075/$0.25) until Sept 9
OpenCode Go: 2× usage (3,160 req/5hrs)

Which route is cheaper depends on workload.
```

## Commands

```bash
npm run radar          # Run discovery cycle
npm run official       # Targeted official-source searches
npm run economics      # Calculate value metrics
npm run md             # Generate Markdown for agents
npm run mcp            # Start MCP server
npm run dashboard      # Generate Live Radar HTML
```

## Testing

```bash
npm test               # 37 tests, zero credits
npm run radar -- --mode replay  # Test against fixtures
```

## Economics

Uses provider-specific workloads for accurate calculations:

| Model | Multiple | Reconciliation |
|-------|----------|----------------|
| MiMo V2.5 | 1.00× | ✓ |
| Hy3 | 1.00× | ✓ |
| GLM-5.3-Flash | 1.00× | ✓ |
| Kimi K2.7 | 1.36× | ✗ +35.9% |

## License

MIT
