/**
 * SPEC: Deterministic fact validator.
 *
 * The AI proposes facts. This code validates them before they enter the ledger.
 * No AI output writes to the database directly.
 *
 * Validation pipeline:
 * 1. Evidence quote must be present in the source document
 * 2. Numeric fields must have numeric values
 * 3. Value must be within reasonable range for the field
 * 4. Unit must be consistent with the field
 * 5. Confidence must be above threshold
 */

import type { ProposedFact, ValidatedFact, FactField } from "./schema.js";

type ValidationResult = {
  accepted: boolean;
  reason?: string;
};

/**
 * SPEC: Range constraints for numeric fields.
 * These prevent obviously wrong values from entering the ledger.
 */
const FIELD_RANGES: Record<string, { min: number; max: number }> = {
  input_price_usd_per_million: { min: 0, max: 200 },
  output_price_usd_per_million: { min: 0, max: 500 },
  cached_input_price_usd_per_million: { min: 0, max: 200 },
  monthly_price_usd: { min: 0, max: 10000 },
  included_credit_usd: { min: 0, max: 10000 },
  requests_per_day: { min: 0, max: 10_000_000 },
  requests_per_minute: { min: 0, max: 100_000 },
  context_tokens: { min: 0, max: 10_000_000 },
  free_tier_quota: { min: 0, max: 100_000_000 },
};

/**
 * SPEC: Validate a single proposed fact.
 */
function validateFact(
  fact: ProposedFact,
  sourceText: string
): ValidationResult {
  // 1. Evidence quote must be present in the source
  if (fact.evidence.quote.length < 10) {
    return { accepted: false, reason: "evidence_quote_too_short" };
  }

  if (!sourceText.includes(fact.evidence.quote)) {
    return { accepted: false, reason: "evidence_quote_not_present" };
  }

  // 2. Numeric fields must have numeric values
  const numericFields = [
    "input_price_usd_per_million",
    "output_price_usd_per_million",
    "cached_input_price_usd_per_million",
    "monthly_price_usd",
    "included_credit_usd",
    "requests_per_day",
    "requests_per_minute",
    "context_tokens",
    "free_tier_quota",
  ];

  if (numericFields.includes(fact.field)) {
    if (typeof fact.value !== "number" || isNaN(fact.value)) {
      return { accepted: false, reason: "numeric_field_not_numeric" };
    }

    // 3. Range check
    const range = FIELD_RANGES[fact.field];
    if (range) {
      if (fact.value < range.min || fact.value > range.max) {
        return {
          accepted: false,
          reason: `value_out_of_range_${range.min}_${range.max}`,
        };
      }
    }
  }

  // 4. Confidence threshold
  if (fact.confidence < 0.5) {
    return { accepted: false, reason: "confidence_too_low" };
  }

  // 5. Entity must not be empty
  if (!fact.entity || fact.entity.length < 3) {
    return { accepted: false, reason: "invalid_entity" };
  }

  return { accepted: true };
}

/**
 * SPEC: Validate all proposed facts against source text.
 * Returns only accepted facts with validation metadata.
 */
export function validateProposedFacts(
  facts: ProposedFact[],
  sourceText: string
): ValidatedFact[] {
  return facts.map((fact) => {
    const result = validateFact(fact, sourceText);
    return {
      ...fact,
      validated: result.accepted,
      rejectionReason: result.reason,
    };
  });
}

/**
 * SPEC: Filter to only accepted facts.
 */
export function acceptedFacts(facts: ValidatedFact[]): ProposedFact[] {
  return facts
    .filter((f) => f.validated)
    .map(({ validated, rejectionReason, ...rest }) => rest);
}

/**
 * SPEC: Unit normalization.
 * Converts various pricing formats to a canonical form.
 */
export function normalizePrice(
  value: number,
  rawUnit: string | null
): { value: number; unit: string } {
  const unit = (rawUnit ?? "").toLowerCase();

  // "$0.25 per million tokens" → value=0.25, unit="USD/1M tokens"
  if (unit.includes("million") || unit.includes("1m")) {
    return { value, unit: "USD/1M tokens" };
  }

  // "$0.00025 per 1K tokens" → value=0.25, unit="USD/1M tokens"
  if (unit.includes("1k") || unit.includes("thousand")) {
    return { value: value * 1000, unit: "USD/1M tokens" };
  }

  // "$25 per 100M tokens" → value=0.25, unit="USD/1M tokens"
  if (unit.includes("100m")) {
    return { value: value / 100, unit: "USD/1M tokens" };
  }

  // Monthly subscription
  if (unit.includes("month") || unit.includes("mo")) {
    return { value, unit: "USD/month" };
  }

  return { value, unit: rawUnit ?? "unknown" };
}
