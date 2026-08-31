# LiveLLM — Live Demo Script (4 minutes)

**Format: Terminal-only. No slides. You narrate while typing.**

---

## ACT 1: The Naive Agent (90 sec)

### Setup

```bash
# Start the API
cd /root/livellm && npm run serve &
```

### The Search

```bash
# "Let's ask an agent to find the cheapest model on OpenCode Go"
hermes -m mimo-v2.5 -z "Search Google for 'opencode go cheapest model pricing 2026'. Tell me: what is the cheapest model on OpenCode Go for a coding agent? Give me the exact input price per million tokens and the model name. Be specific with numbers."
```

**Let the agent search. It will return something like:**

> "GLM-5.3-Flash appears to be one of the cheapest at $0.075/M input tokens on Z.ai, or $0.15/M on OpenCode Go."

### The Trap

```bash
# "Now let's ask it to compute costs"
hermes -m mimo-v2.5 -z "I need to run 500 code reviews per day. Each review uses 1000 input tokens, 55000 cached tokens, and 200 output tokens. Using GLM-5.3-Flash at $0.075/M input, $0.25/M output, and $0.015/M cached — what is my monthly cost? Show the math."
```

**The agent computes:**

```
Per request: (1000 × $0.075 + 55000 × $0.015 + 200 × $0.25) / 1M
           = ($0.075 + $0.825 + $0.05) / 1M
           = $0.00095/request

Monthly: $0.00095 × 500 × 30 = $14.25
```

> "The agent thinks it costs $14.25/month. That seems reasonable. But is it correct?"

---

## ACT 2: LiveLLM Corrects It (90 sec)

### The API Call

```bash
# "Let's ask LiveLLM"
curl -s http://localhost:3847/v1/market?models=GLM-5.3-Flash,MiMo-V2.5 | python3 -m json.tool
```

**Show the output — focus on:**

```json
{
  "model": "GLM-5.3-Flash",
  "routes": [{
    "provider": "OpenCode",
    "input": 0.15,
    "cached_input": 0.03,
    "monthly": 10,
    "usage_value_usd_month": 15,
    "promotion": { "type": "usage_limit_multiplier", "multiplier": 2.0 }
  }]
}
```

```bash
# "Wait — GLM on OpenCode Go is $0.15/M, not $0.075/M. That's the Z.ai price."
# "And it has $15 included usage on a $10 subscription — that's 1.5×"
# "And a 2× promo — so 3× effective"

# "Let's check MiMo"
curl -s http://localhost:3847/v1/market?models=MiMo-V2.5 | python3 -c "
import json,sys
d = json.load(sys.stdin)
m = d['models'][0]['routes'][0]
print(f'MiMo: \${m[\"input\"]}/M base')
print(f'  included usage: \${m.get(\"usage_value_usd_month\", \"?\")}/mo')
print(f'  subscription: \${m.get(\"monthly\", \"?\")}/mo')
print(f'  amortized: \${m[\"input\"] * m.get(\"monthly\",10) / m.get(\"usage_value_usd_month\",60):.4f}/M')
"
```

**Output:**

```
MiMo: $0.14/M base
  included usage: $60/mo
  subscription: $10/mo
  amortized: $0.0233/M
```

### The Correction

```bash
# "Now let's recompute with the right numbers"
hermes -m mimo-v2.5 -z "Recalculate. The correct prices on OpenCode Go are:
- MiMo V2.5: $0.0233/M amortized (6× subscription value)
- GLM-5.3-Flash: $0.05/M amortized (1.5× base × 2× promo)

I need 500 code reviews/day, each using 1000 input tokens, 55000 cached tokens, 200 output tokens.
Cached rate for MiMo: $0.0028/M. Cached rate for GLM: $0.03/M.

Compute monthly cost for BOTH models. Show the math. Which is cheaper?"
```

**The agent now computes:**

```
MiMo: (1000×0.0233 + 55000×0.0028 + 200×0.0467)/1M × 500 × 30
    = (0.0233 + 0.154 + 0.00934)/1M × 15000
    = $2.60/month

GLM: (1000×0.05 + 55000×0.03 + 200×0.1667)/1M × 500 × 30
    = (0.05 + 1.65 + 0.0333)/1M × 15000
    = $25.75/month

MiMo is 9.9× cheaper.
```

### The Punchline

> "The agent's first calculation said $14.25. The correct answer is $2.60 for MiMo — or $25.75 for GLM. The agent picked GLM because it looked cheaper. It was wrong by 10×. And it had no way to know."

---

## ACT 3: The Five Traps (60 sec)

> "This isn't just an OpenCode problem. It's everywhere."

Show the table on screen (print it, don't use slides):

```bash
cat << 'EOF'
THE FIVE PRICING TRAPS

1. SUBSCRIPTIONS make "price" meaningless
   MiMo: $0.14/M base → $0.023/M on Go (6× value)
   GLM:  $0.15/M base → $0.05/M on Go (1.5× + 2× promo)

2. TOOL PRICING is multidimensional
   Tavily: 1 credit × plan × remaining allocation
   Exa: $0.012 to $1/run depending on depth

3. CODING SUBSCRIPTIONS are the same everywhere
   Cursor: $20/$60/$200, two usage pools
   Copilot: AI credits, 50% off GPT-5.6 Sol

4. GPU COMPUTE changes weekly
   Runpod cut prices 4 days ago
   Vast: market price, not catalog price

5. OFFICIAL SURFACES DISAGREE
   OpenCode /docs/go/:  Hy3 = 4,300/5h
   OpenCode /go page:   Hy3 = 5,400/5h
EOF
```

> "The advertised price is never the actual decision-relevant economic state."

---

## ACT 4: The Close (30 sec)

```bash
# "Here's what we built"
curl -s http://localhost:3847/v1/health
# → {"status": "ok", "version": "0.1.0"}

# "9 endpoints, 22 models, provenance on every fact"
curl -s http://localhost:3847/v1/market | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(f'{len(d[\"models\"])} models, {d[\"stats\"][\"total_facts\"]} verified facts')
"

# "Agents can buy this payload for $0.001 via x402"
# "Or just curl it for free during the demo"
```

> "LiveLLM is the verified economic state layer for autonomous agents. We discover via SerpApi, validate against official sources, and serve provenance-backed facts. The math works — we reproduce OpenCode's own published numbers. Autonomous agents need this to get economics right at scale."

---

## TIMING

| Section | Duration | Cumulative |
|---|---|---|
| Naive agent searches Google | 45s | 0:45 |
| Agent computes wrong cost | 45s | 1:30 |
| LiveLLM corrects it | 60s | 2:30 |
| Recompute with right numbers | 30s | 3:00 |
| Five pricing traps | 60s | 4:00 |
| Close | 30s | 4:30 |

Total: ~4:30

---

## WHAT TO HAVE READY

1. `npm run serve` running on :3847
2. `hermes` CLI working with mimo-v2.5
3. Terminal full-screen
4. The five traps printed on a card (in case terminal scrolls)
5. The reconciliation numbers memorized:
   - MiMo: 150,376 ≈ 150,400 (0.02%)
   - GLM: 7,895 ≈ 7,900 (0.07%)
6. The punchline: "10× wrong, and no way to know"

---

## IF A JUDGE ASKS

### "Can we see the full provenance chain?"
```bash
curl -s http://localhost:3847/v1/evidence/<fact-id> | python3 -m json.tool
```
Shows: source → observation → extraction → validation → fact

### "Does this work with other providers?"
Yes — 22 models across OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, OpenRouter, OpenCode, Z.ai.

### "What about non-LLM pricing?"
GPU compute is next (Runpod, Vast, Modal). Tool-call pricing after that (Tavily, Exa, Firecrawl). Same pattern in every domain.

### "How do you handle stale data?"
SerpApi detects changes. We verify against official sources. Facts have temporal validity. Conflicts between sources are flagged, not silently resolved.

### "Is the reconciliation actually correct?"
Yes. We independently compute request costs from token tariffs and reproduce OpenCode's published 150,400 MiMo requests/month (0.02% error).
