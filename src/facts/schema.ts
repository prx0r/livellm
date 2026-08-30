/**
 * SPEC: Fact schema — the canonical representation of an economic truth.
 *
 * Every fact has:
 * - entity_id: "provider:model" or "provider:product"
 * - field: what attribute (price, quota, context, etc.)
 * - value_json: the actual value (number, string, boolean)
 * - unit: optional unit clarification
 * - evidence_id: link to the evidence that supports this fact
 * - valid_from/valid_to: temporal validity (only one active at a time)
 * - confidence: 0-1, how sure we are
 * - verification_state: verified/proposed/disputed
 *
 * The AI proposes facts. Deterministic code validates them.
 * Only validated facts enter the ledger.
 */

export const VALID_FIELDS = [
  "input_price_usd_per_million",
  "output_price_usd_per_million",
  "cached_input_price_usd_per_million",
  "monthly_price_usd",
  "included_credit_usd",
  "requests_per_day",
  "requests_per_minute",
  "context_tokens",
  "promotion_end_at",
  "availability",
  "free_tier_quota",
  "free_tier_period",
] as const;

export type FactField = (typeof VALID_FIELDS)[number];

export type ProposedFact = {
  entity: string;
  field: FactField;
  value: string | number | boolean | null;
  unit: string | null;
  evidence: {
    quote: string;
    selectorHint?: string;
  };
  confidence: number;
};

export type FactExtraction = {
  facts: ProposedFact[];
  ambiguities: string[];
};

export type ValidatedFact = ProposedFact & {
  validated: boolean;
  rejectionReason?: string;
};

export type FactRecord = {
  fact_id: string;
  entity_id: string;
  field: string;
  value_json: string;
  unit: string | null;
  evidence_id: string;
  valid_from: string;
  valid_to: string | null;
  confidence: number;
  verification_state: string;
};

export type ChangeEvent = {
  change_event_id: string;
  entity_id: string;
  event_type: string;
  field: string;
  before_json: string;
  after_json: string;
  evidence_id: string;
  occurred_at: string;
  detected_at: string;
};

/**
 * SPEC: The extraction prompt for the AI.
 * This is what gets sent to the LLM with the official page content.
 */
export function buildExtractionPrompt(
  providerName: string,
  productName: string,
  pageContent: string
): string {
  return `You are a precise financial data extractor. Extract ONLY factual pricing/quota/limit data from this official provider page.

Provider: ${providerName}
Product: ${productName}

PAGE CONTENT:
${pageContent.slice(0, 8000)}

Extract facts as JSON array. Each fact must have:
- entity: "${providerName}:${productName}"
- field: one of [input_price_usd_per_million, output_price_usd_per_million, cached_input_price_usd_per_million, monthly_price_usd, included_credit_usd, requests_per_day, requests_per_minute, context_tokens, free_tier_quota, free_tier_period, availability]
- value: the numeric value (not a string)
- unit: the unit string or null
- evidence.quote: the exact text from the page that supports this value (max 200 chars)
- confidence: 0-1

RULES:
- Only extract values you are highly confident about
- Never guess or infer prices
- If the page mentions "per million tokens", use input_price_usd_per_million
- If the page mentions "per 1K tokens", multiply by 1000
- Include ambiguities as a separate array
- Return ONLY valid JSON, no markdown

Return: { "facts": [...], "ambiguities": [...] }`;
}

/**
 * SPEC: Parse AI output into ProposedFact[].
 */
export function parseExtractionOutput(raw: string): FactExtraction {
  try {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return {
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
    };
  } catch {
    return { facts: [], ambiguities: ["Failed to parse AI output as JSON"] };
  }
}
