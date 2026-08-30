import { validateProposedFacts, acceptedFacts, normalizePrice, isUnitCompatible } from "../src/facts/validate.js";
import type { ProposedFact } from "../src/facts/schema.js";

describe("fact validation", () => {
  const validFact: ProposedFact = {
    entity: "OpenCode:MiMo V2.5",
    field: "input_price_usd_per_million",
    value: 0.14,
    unit: "USD/1M tokens",
    evidence: { quote: "MiMo V2.5 input $0.14 per million tokens" },
    confidence: 0.98,
  };

  const sourceText = "MiMo V2.5 input $0.14 per million tokens output $0.28 per million tokens";

  describe("validateProposedFacts", () => {
    it("accepts valid fact", () => {
      const result = validateProposedFacts([validFact], sourceText);
      expect(result[0].validated).toBe(true);
    });

    it("rejects missing evidence quote", () => {
      const fact = { ...validFact, evidence: { quote: "short" } };
      const result = validateProposedFacts([fact], sourceText);
      expect(result[0].validated).toBe(false);
      expect(result[0].rejectionReason).toBe("evidence_quote_too_short");
    });

    it("rejects evidence not in source", () => {
      const fact = { ...validFact, evidence: { quote: "this text is not in the source document anywhere" } };
      const result = validateProposedFacts([fact], sourceText);
      expect(result[0].validated).toBe(false);
      expect(result[0].rejectionReason).toBe("evidence_quote_not_present");
    });

    it("rejects non-numeric value for numeric field", () => {
      const fact = { ...validFact, value: "not a number" as any };
      const result = validateProposedFacts([fact], sourceText);
      expect(result[0].validated).toBe(false);
      expect(result[0].rejectionReason).toBe("numeric_field_not_numeric");
    });

    it("rejects out of range value", () => {
      const fact = { ...validFact, value: 999 };
      const result = validateProposedFacts([fact], sourceText);
      expect(result[0].validated).toBe(false);
      expect(result[0].rejectionReason).toMatch(/value_out_of_range/);
    });

    it("rejects low confidence", () => {
      const fact = { ...validFact, confidence: 0.3 };
      const result = validateProposedFacts([fact], sourceText);
      expect(result[0].validated).toBe(false);
      expect(result[0].rejectionReason).toBe("confidence_too_low");
    });

    it("rejects invalid entity", () => {
      const fact = { ...validFact, entity: "AB" };
      const result = validateProposedFacts([fact], sourceText);
      expect(result[0].validated).toBe(false);
      expect(result[0].rejectionReason).toBe("invalid_entity");
    });
  });

  describe("acceptedFacts", () => {
    it("filters to only accepted", () => {
      const validated = validateProposedFacts(
        [validFact, { ...validFact, confidence: 0.1 }],
        sourceText
      );
      const accepted = acceptedFacts(validated);
      expect(accepted).toHaveLength(1);
    });
  });

  describe("normalizePrice", () => {
    it("normalizes per million", () => {
      const result = normalizePrice(0.25, "USD/1M tokens");
      expect(result.value).toBe(0.25);
      expect(result.unit).toBe("USD/1M tokens");
    });

    it("converts per 1K to per 1M", () => {
      const result = normalizePrice(0.01, "USD/1K tokens");
      expect(result.value).toBe(10);
      expect(result.unit).toBe("USD/1M tokens");
    });

    it("converts per 100M to per 1M", () => {
      const result = normalizePrice(25, "USD/100M tokens");
      expect(result.value).toBe(0.25);
      expect(result.unit).toBe("USD/1M tokens");
    });

    it("handles monthly", () => {
      const result = normalizePrice(10, "USD/month");
      expect(result.value).toBe(10);
      expect(result.unit).toBe("USD/month");
    });
  });

  describe("isUnitCompatible", () => {
    it("accepts USD for price fields", () => {
      expect(isUnitCompatible("input_price_usd_per_million", "USD/1M tokens")).toBe(true);
    });

    it("accepts null for price fields", () => {
      expect(isUnitCompatible("input_price_usd_per_million", null)).toBe(true);
    });

    it("accepts day for rate fields", () => {
      expect(isUnitCompatible("requests_per_day", "requests/day")).toBe(true);
    });

    it("rejects invalid unit for field", () => {
      expect(isUnitCompatible("input_price_usd_per_million", "requests/day")).toBe(false);
    });
  });
});
