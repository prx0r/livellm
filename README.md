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
```

## HTTP API

```bash
npm run serve    # Port 3847
```

| Endpoint | Description |
|----------|-------------|
| `GET /v1/market` | Compact market snapshot |
| `GET /v1/models/:model` | Detailed model facts |
| `POST /v1/economics/route` | Workload-specific route evaluation |
| `GET /v1/changes` | Recent market changes |
| `GET /v1/health` | Health check |

## SerpApi Integration

| API | Role |
|-----|------|
| Google News Light | Emerging announcements |
| Google Light | Official-source discovery |
| Search Index Deep | Unknown providers/offers |
| Account API | Quota governance |
| JSON Restrictor | Efficient structured acquisition |

## Demo: GLM-5.3-Flash

```
Z.ai: 50% off ($0.075/$0.25) until Sept 9
OpenCode Go: 2× usage (3,160 req/5hrs)

GLM-5.3-Flash economics:
  Baseline: 1.50×
  With promo: 3.00×
```

## Economics

| Model | Multiple | Reconciliation |
|-------|----------|----------------|
| MiMo V2.5 | 6.00× | ✓ |
| Hy3 | 6.00× | ✓ |
| GLM-5.3-Flash | 3.00× | ✓ (2× promo) |
| DeepSeek V4 Flash | 3.00× | ✓ |
| Kimi K2.7 | 8.15× | ✗ +35.9% |

## Commands

```bash
npm run radar          # Discovery cycle
npm run official       # Official-source searches
npm run daily          # Full daily cycle
npm run economics      # Value calculations
npm run glm-demo       # GLM promotion demo
npm run serve          # HTTP API server
npm run mcp            # MCP server (read-only)
npm run md             # Agent-ready output
```

## Testing

```bash
npm test               # 76 tests, zero credits
npm run radar -- --mode replay  # Test against fixtures
```

## License

MIT
