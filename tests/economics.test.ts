import { calculateEconomics, formatEconomics, WORKLOADS, PROVIDER_WORKLOADS } from "../src/facts/economics.js";
import type { PricingPlan, Workload } from "../src/facts/economics.js";

describe("economics", () => {
  describe("calculateEconomics", () => {
    it("returns not_computable when input price missing", () => {
      const result = calculateEconomics(
        "test", "Test", "Model",
        { kind: "payg", inputPerMillion: 0, outputPerMillion: 0.5 },
        { uncachedInputTokens: 1000, cachedInputTokens: 0, outputTokens: 200 }
      );
      expect(result.status).toBe("not_computable");
      if (result.status === "not_computable") {
        expect(result.missing).toContain("input_price");
      }
    });

    it("returns not_computable when subscription price missing", () => {
      const result = calculateEconomics(
        "test", "Test", "Model",
        { kind: "subscription", monthlyPrice: 0, inputPerMillion: 0.14, outputPerMillion: 0.28 },
        { uncachedInputTokens: 830, cachedInputTokens: 71500, outputTokens: 295 }
      );
      expect(result.status).toBe("not_computable");
      if (result.status === "not_computable") {
        expect(result.missing).toContain("subscription_price");
      }
    });

    it("returns not_computable when workload is zero", () => {
      const result = calculateEconomics(
        "test", "Test", "Model",
        { kind: "payg", inputPerMillion: 0.14, outputPerMillion: 0.28 },
        { uncachedInputTokens: 0, cachedInputTokens: 0, outputTokens: 0 }
      );
      expect(result.status).toBe("not_computable");
      if (result.status === "not_computable") {
        expect(result.missing).toContain("workload");
      }
    });

    it("calculates PAYG economics correctly", () => {
      const result = calculateEconomics(
        "test", "Test", "Model",
        { kind: "payg", inputPerMillion: 0.15, outputPerMillion: 0.50 },
        { uncachedInputTokens: 1000, cachedInputTokens: 0, outputTokens: 200 }
      );
      expect(result.status).toBe("computed");
      if (result.status === "computed") {
        expect(result.costPerRequest).toBeGreaterThan(0);
        expect(result.plan.kind).toBe("payg");
      }
    });

    it("calculates MiMo V2.5 economics correctly", () => {
      const result = calculateEconomics(
        "OpenCode:MiMo V2.5", "OpenCode", "MiMo V2.5",
        {
          kind: "subscription",
          monthlyPrice: 10,
          inputPerMillion: 0.14,
          outputPerMillion: 0.28,
          cachedInputPerMillion: 0.0028,
          usageValueUsd: 60,
          requestsPerMonth: 150400,
        },
        PROVIDER_WORKLOADS["OpenCode:MiMo V2.5"]
      );
      expect(result.status).toBe("computed");
      if (result.status === "computed") {
        // Multiple = simulatedMonthly / monthlyPrice = $60 / $10 = 6.0
        expect(result.effectiveMultiple).toBeCloseTo(6.0, 1);
        expect(result.reconciliationStatus).toBe("consistent");
      }
    });

    it("detects major disagreement", () => {
      const result = calculateEconomics(
        "test", "Test", "Kimi",
        {
          kind: "subscription",
          monthlyPrice: 10,
          inputPerMillion: 0.95,
          outputPerMillion: 4,
          cachedInputPerMillion: 0.19,
          usageValueUsd: 60,
          requestsPerMonth: 6750,
        },
        { uncachedInputTokens: 870, cachedInputTokens: 55000, outputTokens: 200 }
      );
      expect(result.status).toBe("computed");
      if (result.status === "computed") {
        expect(result.reconciliationStatus).toBe("major_disagreement");
      }
    });

    it("applies promotion multiplier", () => {
      const result = calculateEconomics(
        "test", "Test", "GLM",
        {
          kind: "subscription",
          monthlyPrice: 10,
          inputPerMillion: 0.15,
          outputPerMillion: 0.5,
          cachedInputPerMillion: 0.03,
          usageValueUsd: 30,
          requestsPerMonth: 7900,
          promotionMultiplier: 2,
        },
        { uncachedInputTokens: 1000, cachedInputTokens: 55000, outputTokens: 200 }
      );
      expect(result.status).toBe("computed");
      if (result.status === "computed") {
        // Should have 2× note
        expect(result.notes.some(n => n.includes("2×"))).toBe(true);
        // Effective multiple should be ~3.0 (15800 × $0.0019 / $10)
        expect(result.effectiveMultiple).toBeGreaterThan(2.5);
        expect(result.effectiveMultiple).toBeLessThan(3.5);
      }
    });

    it("formats not_computable result", () => {
      const result = calculateEconomics(
        "test", "Test", "Model",
        { kind: "payg", inputPerMillion: 0, outputPerMillion: 0 },
        { uncachedInputTokens: 0, cachedInputTokens: 0, outputTokens: 0 }
      );
      const formatted = formatEconomics(result);
      expect(formatted).toContain("Not computable");
    });

    it("formats computed result", () => {
      const result = calculateEconomics(
        "test", "Test", "Model",
        {
          kind: "subscription",
          monthlyPrice: 10,
          inputPerMillion: 0.14,
          outputPerMillion: 0.28,
          usageValueUsd: 60,
          requestsPerMonth: 150400,
        },
        { uncachedInputTokens: 830, cachedInputTokens: 71500, outputTokens: 295 }
      );
      const formatted = formatEconomics(result);
      expect(formatted).toContain("Test / Model");
      expect(formatted).toContain("Effective multiple");
    });
  });

  describe("WORKLOADS", () => {
    it("has provider-specific workloads", () => {
      expect(PROVIDER_WORKLOADS["OpenCode:MiMo V2.5"]).toBeDefined();
      expect(PROVIDER_WORKLOADS["OpenCode:GLM-5.3-Flash"]).toBeDefined();
    });

    it("MiMo workload matches provider docs", () => {
      const w = PROVIDER_WORKLOADS["OpenCode:MiMo V2.5"];
      expect(w.uncachedInputTokens).toBe(830);
      expect(w.cachedInputTokens).toBe(71500);
      expect(w.outputTokens).toBe(295);
    });
  });
});
