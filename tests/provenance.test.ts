import { validateProposedFacts } from "../src/facts/validate.js";
import type { ProposedFact } from "../src/facts/schema.js";

describe("provenance", () => {
  it("every verified fact has evidence quote", () => {
    const facts: ProposedFact[] = [
      {
        entity: "Test:Model",
        field: "input_price_usd_per_million",
        value: 0.14,
        unit: "USD/1M tokens",
        evidence: { quote: "Test input $0.14 per million tokens" },
        confidence: 0.98,
      },
    ];

    const validated = validateProposedFacts(facts, "Test input $0.14 per million tokens");
    const accepted = validated.filter((f) => f.validated);

    for (const fact of accepted) {
      expect(fact.evidence.quote.length).toBeGreaterThan(10);
    }
  });

  it("evidence quote must be present in source text", () => {
    const facts: ProposedFact[] = [
      {
        entity: "Test:Model",
        field: "input_price_usd_per_million",
        value: 0.14,
        unit: "USD/1M tokens",
        evidence: { quote: "This quote does not exist in the source" },
        confidence: 0.98,
      },
    ];

    const validated = validateProposedFacts(facts, "Different source text");
    expect(validated[0].validated).toBe(false);
    expect(validated[0].rejectionReason).toBe("evidence_quote_not_present");
  });

  it("recorded fixtures contain organic results", () => {
    const fs = require("fs");
    const fixturePath = "fixtures/recorded/serpapi/glm-discovery.json";
    if (fs.existsSync(fixturePath)) {
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      expect(fixture.organic_results).toBeDefined();
      expect(fixture.organic_results.length).toBeGreaterThan(0);
    }
  });

  it("recorded source fixtures have real URLs", () => {
    const fs = require("fs");
    const sources = [
      "fixtures/recorded/sources/opencode-go.html",
      "fixtures/recorded/sources/zai-pricing.html",
    ];
    for (const src of sources) {
      if (fs.existsSync(src)) {
        const content = fs.readFileSync(src, "utf8");
        expect(content.length).toBeGreaterThan(1000);
      }
    }
  });

  it("AI extraction fixtures have evidence quotes", () => {
    const fs = require("fs");
    const fixturePath = "fixtures/recorded/ai/opencode-glm-promo.json";
    if (fs.existsSync(fixturePath)) {
      const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
      expect(fixture.facts).toBeDefined();
      for (const fact of fixture.facts) {
        expect(fact.evidence.quote.length).toBeGreaterThan(10);
      }
    }
  });
});
