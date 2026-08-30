# LiveLLM

**The live truth and market-intelligence layer for AI.**

LiveLLM discovers LLM pricing changes through SerpApi, verifies them against official sources, calculates economic impact, and measures when AI answers have gone stale.

## Quick Start

```bash
npm install
npm run build

# Run full pipeline
npm run radar        # Discover pricing changes
npm run economics    # Calculate value metrics
npm run md           # Generate agent-ready output

# Or run the demo
npm run replay       # Test against fixtures
```

## Architecture

```
SerpApi Radar → Candidates → Official Sources → AI Extraction → Facts → Economics
     ↓              ↓              ↓                ↓            ↓          ↓
  Search IDs    Prefilter     Verification    Deterministic   Ledger   MiMo 6×
                                                     ↑                  Kimi 10.5×
                                                Validation
```

## Commands

| Command | Description |
|---------|-------------|
| `radar` | Run discovery cycle (News Light, Google Light, Search Index) |
| `official` | Targeted official-source searches (`site:openai.com`) |
| `investigate` | AI extraction with deterministic validation |
| `economics` | Calculate LLMDeals workload simulation |
| `facts` | Show current fact ledger |
| `changes` | Show recent price/quota changes |
| `md` | Generate Markdown payload for agents |
| `mcp` | Start MCP server for AI agents |
| `dashboard` | Generate Live Radar HTML dashboard |

## SerpApi Integration

- **Google News Light**: Fresh pricing announcements
- **Google Light**: Broad discovery + related questions/searches
- **Search Index**: Deep exploration with `mode=deep`
- **JSON Restrictor**: 60% smaller payloads
- **Account API**: Quota governor with reserve
- **Search Archive**: Provenance for every fact

## Economics Engine

Calculates value using the LLMDeals workload simulation:

| Model | Simulated | Provider | Reconciliation |
|-------|-----------|----------|----------------|
| MiMo V2.5 | $60.01 | $60 | ✓ +0.02% |
| Hy3 | $59.98 | $60 | ✓ -0.03% |
| Kimi K2.7 | $104.99 | $60 | ✗ +75% |
| DeepSeek V4 Flash | $33.18 | $30 | ✓ +10.6% |

## MCP Tools

```json
{
  "tools": [
    "get_market_snapshot",
    "get_model_details",
    "get_recent_changes",
    "run_radar",
    "get_candidates",
    "compare_models"
  ]
}
```

## Testing

```bash
npm test              # 37 tests, zero credits
npm run radar -- --mode replay  # Test against fixtures
```

## License

MIT
