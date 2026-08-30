# Promotion Detection Guide

## How to Detect Provider Promotions

### Pattern 1: Usage Multipliers (e.g., "2× usage")

**What to look for:**
- "2× usage", "double usage", "2x limits"
- "limited time", "for a limited time"
- Charts showing higher request counts than normal

**Example: OpenCode Go GLM-5.3-Flash (Aug 2026)**
- Normal: 1,580 requests/5hrs, $15 usage
- Promo: 3,160 requests/5hrs, $30 usage
- Effective multiplier: 3.82× (vs normal 1.91×)

**Sources to check:**
- Provider pricing page (e.g., opencode.ai/go)
- Provider X/Twitter announcements
- Provider blog posts

### Pattern 2: Price Discounts (e.g., "50% off")

**What to look for:**
- Strikethrough prices (~~$0.15~~ $0.075)
- "50% off", "limited-time pricing"
- Promotion end dates

**Example: z.ai GLM-5.3-Flash (Aug 2026)**
- List price: $0.15/$0.50
- Promo price: $0.075/$0.25 (50% off)
- Ends: September 9, 2026

**Sources to check:**
- Provider pricing page (e.g., docs.z.ai/guides/overview/pricing)
- Provider blog announcements

### Pattern 3: Cross-Provider Price Differences

**What to look for:**
- Same model, different prices across providers
- One provider passing through discounts, another not

**Example: GLM-5.3-Flash pricing (Aug 2026)**
| Provider | Input/1M | Output/1M | Notes |
|----------|----------|-----------|-------|
| z.ai (promo) | $0.075 | $0.25 | 50% off |
| OpenRouter | $0.075 | $0.25 | Matches promo |
| OpenCode Go | $0.15 | $0.50 | Not passing discount |

## Detection Checklist

When crawling provider pages, check for:

1. **Usage multipliers**: "2×", "double", "10×", "25×", "50×", "100×"
2. **Price discounts**: Strikethrough prices, "% off", "limited time"
3. **Promotion end dates**: "until September 9", "ends Friday"
4. **Cross-provider differences**: Compare same model across providers
5. **Announcement timing**: When was the promo announced? Is it new?

## Data Model Fields

Add these to the fact schema:

```typescript
type PromotionInfo = {
  type: "usage_multiplier" | "price_discount" | "credits_bonus";
  value: number; // e.g., 2 for 2× usage, 50 for 50% off
  endsAt?: string; // ISO date
  announcedAt?: string; // ISO date
  source?: string; // URL where promo was found
};
```

## Example Crawl Queries

```
# Check for promotions
site:opencode.ai "2x" OR "double usage" OR "limited time"
site:z.ai "50% off" OR "limited-time" OR "promotion"

# Cross-provider comparison
"GLM-5.3-Flash" pricing comparison
"GLM-5.3-Flash" OpenCode z.ai OpenRouter
```

## Why This Matters

Promotions create temporary arbitrage opportunities:
- z.ai charges $0.075, OpenCode Go charges $0.15 (2× more)
- But OpenCode Go gives 2× usage, so effective cost is similar
- LiveLLM should surface these tradeoffs to users

## Last Updated

- GLM-5.3-Flash 2× usage promo: Detected Aug 30, 2026
- z.ai 50% off promo: Detected Aug 30, 2026 (ends Sept 9, 2026)
