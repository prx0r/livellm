import type { SearchHit } from "../search/types.js";

/**
 * SPEC: Deterministic candidate detection from search hits.
 *
 * Extracts structured hints from title + snippet:
 * - provider_hint: company/provider name (e.g., "OpenAI", "Anthropic")
 * - product_hint: specific product (e.g., "GPT-4", "Claude API")
 * - change_type: what kind of change (pricing, free_tier, quota, launch)
 *
 * This is the deterministic prefilter before AI extraction.
 * The AI step (CP6) will refine these hints.
 */

const PROVIDERS = [
  "OpenAI", "Anthropic", "Google", "DeepSeek", "Mistral", "Meta",
  "Cohere", "AI21", "Inflection", "Stability", "xAI", "Groq",
  "Fireworks", "Together", "Replicate", "Hugging Face", "Cursor",
  "GitHub", "Windsurf", "Replit", "Codeium", "Sourcegraph",
];

const CHANGE_PATTERNS: Array<[RegExp, string]> = [
  [/\b(pricing|price|cost|cheaper|expensive|reduction|cut|slash)\b/i, "pricing"],
  [/\b(free tier|free plan|free credits|free tokens|no cost)\b/i, "free_tier"],
  [/\b(quota|limit|rate limit|requests? per|tokens? per)\b/i, "quota"],
  [/\b(launch|launches|announces?|introduces?|unveils?)\b/i, "launch"],
  [/\b(subscription|plan|pro plan|enterprise|pricing tier)\b/i, "subscription"],
  [/\b(credits?|bonus|promotion|promo)\b/i, "credits"],
];

const PRICE_RE = /\$(\d+(?:\.\d+)?)\s*(?:\/|per)\s*(?:million|1M|1k|1000)?\s*(?:tokens?|words?|characters?)?/i;

export type CandidateHints = {
  providerHint?: string;
  productHint?: string;
  changeType?: string;
  price?: string;
  confidence: number;
};

export function detectCandidateHints(hit: SearchHit): CandidateHints {
  const text = `${hit.title} ${hit.snippet ?? ""}`;
  const hints: CandidateHints = { confidence: 0 };

  // Detect provider
  for (const provider of PROVIDERS) {
    if (text.includes(provider)) {
      hints.providerHint = provider;
      hints.confidence += 0.3;
      break;
    }
  }

  // Detect product (simple pattern: "Provider Product" or "Product API")
  const productMatch = text.match(
    /(?:GPT-?4|Claude|Gemini|Llama|Mistral|DeepSeek|Qwen|Kimi|Grok|Copilot|Cursor|Windsurf)(?:\s+(?:API|Pro|Ultra|Plus))?/i
  );
  if (productMatch) {
    hints.productHint = productMatch[0];
    hints.confidence += 0.2;
  }

  // Detect change type
  for (const [pattern, changeType] of CHANGE_PATTERNS) {
    if (pattern.test(text)) {
      hints.changeType = changeType;
      hints.confidence += 0.3;
      break;
    }
  }

  // Detect price mention
  const priceMatch = text.match(PRICE_RE);
  if (priceMatch) {
    hints.price = priceMatch[0];
    hints.confidence += 0.2;
  }

  // Lower confidence if title is too generic
  if (text.length < 50) hints.confidence *= 0.5;

  return hints;
}

/**
 * SPEC: Extract official source URL from search results.
 * Uses official-domains allowlist for authority check.
 */
import { findOfficialUrl as findOfficialFromAllowlist } from "./official-domains.js";

export function findOfficialUrl(hits: SearchHit[], providerHint?: string): string | undefined {
  return findOfficialFromAllowlist(hits, providerHint);
}
