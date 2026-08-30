/**
 * SPEC: Fact schema — the canonical representation of an economic truth.
 *
 * Every fact has:
 * - entity_id: "provider:model" or "provider:model:route"
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
  // Pricing
  "input_price_usd_per_million",
  "output_price_usd_per_million",
  "cached_input_price_usd_per_million",

  // List prices (before any promo)
  "list_input_price_usd_per_million",
  "list_cached_input_price_usd_per_million",
  "list_output_price_usd_per_million",

  // Subscription
  "subscription_price_usd_month",

  // Request limits
  "request_limit_5h",
  "request_limit_week",
  "request_limit_month",

  // Usage value
  "usage_value_usd_5h",
  "usage_value_usd_week",
  "usage_value_usd_month",

  // Workload
  "input_tokens_per_request",
  "cached_tokens_per_request",
  "output_tokens_per_request",

  // Capabilities
  "quality_tier",
  "context_tokens",
  "free_tier_quota",
  "free_tier_period",
  "requests_per_day",
  "speed_tier",
  "tokens_per_second",

  // Promotions
  "promotion_type",
  "promotion_multiplier",
  "promotion_discount_pct",
  "promotion_start_at",
  "promotion_end_at",

  // Legacy (for backwards compatibility)
  "monthly_price_usd",
  "included_credit_usd",
  "requests_per_day",
  "requests_per_minute",
  "context_tokens",
  "availability",
  "free_tier_quota",
  "free_tier_period",
] as const;

export type FactField = (typeof VALID_FIELDS)[number];

/**
 * SPEC: Unified field specification.
 * Single source of truth for field type, range, and unit requirements.
 * Validators and extractors consume this — never maintain parallel arrays.
 */
export type FieldSpec = {
  kind: "numeric" | "string" | "date";
  min?: number;
  max?: number;
  unitGroup?: "price" | "rate" | "size" | "none";
};

export const FIELD_SPEC: Record<FactField, FieldSpec> = {
  // Pricing
  input_price_usd_per_million:            { kind: "numeric", min: 0, max: 200, unitGroup: "price" },
  output_price_usd_per_million:           { kind: "numeric", min: 0, max: 500, unitGroup: "price" },
  cached_input_price_usd_per_million:     { kind: "numeric", min: 0, max: 200, unitGroup: "price" },

  // List prices
  list_input_price_usd_per_million:       { kind: "numeric", min: 0, max: 200, unitGroup: "price" },
  list_cached_input_price_usd_per_million:{ kind: "numeric", min: 0, max: 200, unitGroup: "price" },
  list_output_price_usd_per_million:      { kind: "numeric", min: 0, max: 500, unitGroup: "price" },

  // Subscription
  subscription_price_usd_month:           { kind: "numeric", min: 0, max: 10000, unitGroup: "price" },

  // Request limits
  request_limit_5h:                       { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "rate" },
  request_limit_week:                     { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "rate" },
  request_limit_month:                    { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "rate" },

  // Usage value
  usage_value_usd_5h:                     { kind: "numeric", min: 0, max: 10000, unitGroup: "price" },
  usage_value_usd_week:                   { kind: "numeric", min: 0, max: 10000, unitGroup: "price" },
  usage_value_usd_month:                  { kind: "numeric", min: 0, max: 10000, unitGroup: "price" },

  // Workload
  input_tokens_per_request:               { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "size" },
  cached_tokens_per_request:              { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "size" },
  output_tokens_per_request:              { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "size" },

  // Capabilities
  quality_tier:                           { kind: "string" },
  speed_tier:                             { kind: "string" },
  tokens_per_second:                      { kind: "numeric", min: 0, max: 10000, unitGroup: "none" },

  // Promotions
  promotion_type:                         { kind: "string" },
  promotion_multiplier:                   { kind: "numeric", min: 1, max: 100, unitGroup: "none" },
  promotion_discount_pct:                 { kind: "numeric", min: 0, max: 100, unitGroup: "none" },
  promotion_start_at:                     { kind: "date" },
  promotion_end_at:                       { kind: "date" },

  // Legacy
  monthly_price_usd:                      { kind: "numeric", min: 0, max: 10000, unitGroup: "price" },
  included_credit_usd:                    { kind: "numeric", min: 0, max: 10000, unitGroup: "price" },
  requests_per_day:                       { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "rate" },
  requests_per_minute:                    { kind: "numeric", min: 0, max: 100_000, unitGroup: "rate" },
  context_tokens:                         { kind: "numeric", min: 0, max: 10_000_000, unitGroup: "size" },
  availability:                           { kind: "string" },
  free_tier_quota:                        { kind: "numeric", min: 0, max: 100_000_000, unitGroup: "rate" },
  free_tier_period:                       { kind: "string" },
};

/** All numeric fields, derived from FIELD_SPEC — never maintain a separate list. */
export const NUMERIC_FIELDS = (Object.keys(FIELD_SPEC) as FactField[]).filter(
  (f) => FIELD_SPEC[f].kind === "numeric"
);

/** All fields that require unit validation, grouped by compatible unit type. */
export const UNIT_GROUPS = {
  price: NUMERIC_FIELDS.filter((f) => FIELD_SPEC[f].unitGroup === "price"),
  rate:  NUMERIC_FIELDS.filter((f) => FIELD_SPEC[f].unitGroup === "rate"),
  size:  NUMERIC_FIELDS.filter((f) => FIELD_SPEC[f].unitGroup === "size"),
};

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
  return `You are a precise financial data extractor. Extract ONLY factual pricing/quota/limit/promotion data from this official provider page.

Provider: ${providerName}
Product: ${productName}

PAGE CONTENT:
${pageContent.slice(0, 8000)}

Extract facts as JSON array. Each fact must have:
- entity: "${providerName}:${productName}"
- field: one of [input_price_usd_per_million, output_price_usd_per_million, cached_input_price_usd_per_million, subscription_price_usd_month, request_limit_5h, request_limit_week, request_limit_month, usage_value_usd_month, input_tokens_per_request, cached_tokens_per_request, output_tokens_per_request, promotion_type, promotion_multiplier, promotion_discount_pct, promotion_start_at, promotion_end_at]
- value: the numeric value (not a string)
- unit: the unit string or null
- evidence.quote: the exact text from the page that supports this value (max 200 chars)
- confidence: 0-1

RULES:
- Only extract values you are highly confident about
- Never guess or infer prices
- If the page mentions "per million tokens", use input_price_usd_per_million
- If the page mentions "per 1K tokens", multiply by 1000
- For promotions: use promotion_type="usage_multiplier" or "price_discount"
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
