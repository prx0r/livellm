# LiveLLM — Live Demo Script v2 (4:30)

**Format: Terminal-only. No slides. You narrate while typing.**
**Core: Agent computes whether a bounty is worth doing. Gets it wrong without LiveLLM.**

---

## SETUP (before demo, 30 sec)

```bash
# Start API
cd /root/livellm && npm run serve &

# Verify
curl -s http://localhost:3847/v1/health
```

---

## ACT 1: The Bounty (30 sec)

Set the scene:

> "An autonomous agent finds a bounty: **Fix a flaky test in a Python repo. Pay: $15.** The agent needs to decide: is this worth doing? It needs to compute its projected cost."

Show the bounty:

```bash
cat << 'EOF'
═══════════════════════════════════════════════
  BOUNTY: Fix flaky test in auth-service
  PAYOUT: $15.00
  DEADLINE: 2 hours
  REQUIREMENTS:
    - Read codebase (~50K tokens input)
    - Identify flaky test (~20K tokens input)
    - Write fix (~5K tokens output)
    - Verify fix passes (~30K tokens input)
  TOTAL: ~100K input tokens, ~5K output tokens
═══════════════════════════════════════════════
EOF
```

---

## ACT 2: The Stale Decision (60 sec)

### The agent's first calculation (no LiveLLM)

```bash
hermes -m mimo-v2.5 -z "I need to decide if a $15 bounty is worth doing.

My workload:
- 100,000 input tokens total (across 4 steps)
- 5,000 output tokens total
- I'll use GLM-5.3-Flash on Z.ai at $0.075/M input, $0.25/M output

Compute:
1. My total inference cost
2. My projected profit ($15 - cost)
3. Should I take this bounty?

Show the math."
```

**Agent computes:**

```
Cost: (100000 × $0.075 + 5000 × $0.25) / 1,000,000
    = ($7.50 + $1.25) / 1,000,000
    = $0.00875

Profit: $15.00 - $0.01 = $14.99
Decision: YES — 99.9% margin
```

> "The agent says yes. $14.99 profit. Sounds great. But is the cost correct?"

### The problem

```bash
# "The agent used $0.075/M — that's the Z.ai pay-as-you-go price."
# "But if the agent is on OpenCode Go, the economics are completely different."
# "Let's ask LiveLLM."
```

---

## ACT 3: LiveLLM Corrects (90 sec)

### Fetch the real economics

```bash
curl -s http://localhost:3847/v1/market?models=GLM-5.3-Flash,MiMo-V2.5 | python3 -c "
import json, sys
d = json.load(sys.stdin)
for m in d['models']:
    for r in m['routes']:
        if r['provider'] == 'OpenCode':
            eff = r['input'] * r.get('monthly',10) / r.get('usage_value_usd_month',60)
            print(f'{m[\"model\"]:20s}  base=\${r[\"input\"]/M}  amortized=\${eff:.4f}/M  ctx={r.get(\"context_tokens\",\"?\")}')
"
```

**Output:**

```
GLM-5.3-Flash         base=$0.15/M  amortized=$0.0500/M  ctx=128000
MiMo V2.5             base=$0.14/M  amortized=$0.0233/M  ctx=1000000
```

### The correction

```bash
hermes -m mimo-v2.5 -z "RECALCULATE with correct OpenCode Go pricing:

MiMo V2.5: $0.0233/M input (amortized), $0.0467/M output
  - 1M context window (fits entire codebase)
  - Cached input: $0.0028/M (most of my input will be cached)

GLM-5.3-Flash: $0.05/M input (amortized), $0.1667/M output  
  - 128K context (may need to chunk)
  - Cached input: $0.03/M

Same workload: 100K input tokens, 5K output tokens.
Assume 70% of input is cached (repeated code patterns).

For EACH model, compute:
1. Total inference cost
2. Whether 128K context is enough for GLM (or if I need MiMo's 1M)
3. Projected profit ($15 - cost)
4. Which model should I use?
5. Should I take this bounty?"

Show the math for both models."
```

**Agent now computes:**

```
MiMo V2.5:
  Uncached: 30K × $0.0233/M = $0.000699
  Cached:   70K × $0.0028/M = $0.000196
  Output:    5K × $0.0467/M = $0.000234
  Total: $0.001129
  Profit: $14.999

GLM-5.3-Flash:
  Uncached: 30K × $0.05/M = $0.0015
  Cached:   70K × $0.03/M = $0.0021
  Output:    5K × $0.1667/M = $0.000834
  Total: $0.004434
  Profit: $14.996

Both profitable. MiMo is 3.9× cheaper.
GLM has 128K context — might not fit 50K codebase + prompt.
MiMo has 1M — plenty of room.
Decision: Use MiMo V2.5. Take the bounty.
```

### The punchline

> "Both calculations say take the bounty. But look at the cost difference: $0.001 vs $0.004. That's 4×. Now multiply by 500 bounties a day. The agent just saved $1.50/day by using the right price. That's $45/month. More importantly — it picked the right model for the job."

---

## ACT 4: The Deeper Problem (60 sec)

> "But here's what's really dangerous. What if the bounty paid $2?"

```bash
hermes -m mimo-v2.5 -z "Same workload. But the bounty pays only $2.

With MiMo at $0.001129 cost: profit = $1.999 → TAKE
With GLM at $0.004434 cost: profit = $1.996 → TAKE

Now consider: what if I didn't know about subscriptions and used the raw prices?

GLM at $0.075/M input: cost = (30K×0.075 + 70K×0.015 + 5K×0.25)/1M = $0.0035
MiMo at $0.14/M input: cost = (30K×0.14 + 70K×0.0028 + 5K×0.28)/1M = $0.00476

With raw prices, MiMo looks MORE expensive than GLM.
The agent picks GLM. Wrong model, wrong context window, wrong price."
```

> "The agent's economic model was wrong. It picked the wrong model. At scale, this compounds. One wrong pricing assumption × 500 agents × 30 days = thousands of dollars in wasted compute. And the agent has no way to validate its own assumptions."

---

## ACT 5: The Five Traps (45 sec)

> "This isn't just an LLM problem. It's the same pattern in every domain autonomous agents touch."

```bash
cat << 'TRAPS'
THE FIVE PRICING TRAPS (same problem, five domains)

                    LLM             Compute         Tools
                    ─────────────   ─────────────   ─────────────
nominal≠effective   Go subs         reserved GPU    monthly credits
time-dependent      peak/off-peak   spot market     promotions
route-dependent     Z.ai vs OC      host/region     API plan
state-dependent     quota left      credits left    credits left
source disagreement OC locales      API vs landing  docs vs pricing

CloudPrice tracks compute prices.
AgentDeals tracks free tiers.
Neither tells you what YOUR next request actually costs
given YOUR subscription, YOUR quota, YOUR promotion.

LiveLLM does.
TRAPS
```

---

## ACT 6: The x402 Close (30 sec)

> "Every payload is timestamped and purchasable."

```bash
curl -s http://localhost:3847/v1/x402/pricing | python3 -m json.tool
```

> "An agent pays $0.001 per query. That's $0.30/month for daily checks. If it saves $45/month on wrong pricing assumptions, the ROI is 150×."

> "And because every fact has provenance — a SerpApi search ID, an official source URL, a validation record — the agent can prove it used correct information. That's the difference between a pricing table and verified economic state."

```bash
# Show provenance
curl -s http://localhost:3847/v1/evidence/$(curl -s http://localhost:3847/v1/market | python3 -c "
import json,sys
d = json.load(sys.stdin)
for m in d['models']:
    if m['model'] == 'MiMo V2.5':
        print(m['routes'][0].get('freshness',{}).get('evidence_id',''))
        break
") | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(f'Source: {d.get(\"source_type\",\"?\")}')
print(f'Verified: {d.get(\"verification_state\",\"?\")}')
print(f'Observed: {d.get(\"observed_at\",\"?\")}')
"
```

---

## ACT 7: The Close (15 sec)

> "LiveLLM is the verified economic state layer for autonomous agents. We discover pricing changes via SerpApi, validate them against official sources, and serve provenance-backed facts. An agent that knows what things actually cost can make good economic decisions. An agent that doesn't is flying blind. We built the instrument panel."

---

## TIMING

| Section | Duration | Cumulative |
|---|---|---|
| The bounty | 30s | 0:30 |
| Stale decision | 60s | 1:30 |
| LiveLLM corrects | 90s | 3:00 |
| The deeper problem | 60s | 4:00 |
| Five traps | 45s | 4:45 |
| x402 close | 30s | 5:15 |
| The close | 15s | 5:30 |

Total: ~5:30 (tight but doable — trim the deeper problem section if needed)

---

## WHAT TO HAVE READY

1. API running on :3847
2. hermes CLI working with mimo-v2.5
3. Terminal full-screen
4. The bounty card printed or memorized
5. The key numbers:
   - MiMo amortized: $0.0233/M
   - GLM amortized: $0.05/M
   - MiMo cached: $0.0028/M
   - GLM cached: $0.03/M
6. The punchline: "4× cost difference, wrong model, no way to validate"

---

## IF A JUDGE ASKS

### "Why not just use CloudPrice or AgentDeals?"
CloudPrice tracks compute prices. AgentDeals tracks free tiers. Neither tells you what YOUR next request actually costs given YOUR subscription, YOUR quota, YOUR promotion. LiveLLM computes the decision-relevant economic state, not just the list price.

### "How does x402 work?"
The agent gets a 402 Payment Required response with the price. It pays $0.001 via Coinbase x402. Receives the verified payload with timestamp and provenance. Total cost: $0.001 + $0.001 fee = $0.002.

### "Is the reconciliation correct?"
Yes. We independently compute request costs from token tariffs and reproduce OpenCode's published 150,400 MiMo requests/month (0.02% error) and 7,900 GLM requests/month (0.07% error).

### "What about when subscriptions change?"
SerpApi detects changes on official sources. Fact ledger updates. Old fact closes, new fact opens. Agent re-checks on next query. Temporal semantics are built in.

### "How many models?"
22 models across 8 providers. But the real answer is: any model where we can verify the economics against official sources.
