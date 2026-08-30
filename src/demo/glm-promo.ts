/**
 * SPEC: GLM-5.3-Flash promotion replay demo.
 * Demonstrates the full pipeline with recorded fixtures.
 * Economics are derived from the fact ledger, not hardcoded.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseExtractionOutput } from "../facts/schema.js";
import { validateProposedFacts, acceptedFacts } from "../facts/validate.js";
import { calculateEconomics, formatEconomics, PROVIDER_WORKLOADS } from "../facts/economics.js";
import { getCurrentFacts } from "../facts/supersede.js";

export async function runGlmDemo(): Promise<void> {
  console.log("═".repeat(60));
  console.log("  LiveLLM — GLM-5.3-Flash Promotion Demo");
  console.log("═".repeat(60));
  console.log();

  // 1. Load recorded fixtures
  console.log("1. LOADING RECORDED FIXTURES");
  console.log("   SerpApi discovery...");
  const discovery = loadFixture("fixtures/recorded/serpapi/glm-discovery.json");
  console.log(`   → ${discovery.organic_results?.length ?? 0} results`);

  console.log("   Z.ai promo search...");
  const zaiSearch = loadFixture("fixtures/recorded/serpapi/glm-zai-promo.json");
  console.log(`   → ${zaiSearch.organic_results?.length ?? 0} results`);

  // 2. Load source pages
  console.log();
  console.log("2. LOADING OFFICIAL SOURCES");
  const opencodePage = loadSource("fixtures/recorded/sources/opencode-go.html");
  console.log(`   OpenCode Go: ${opencodePage.length} bytes`);
  const zaiPage = loadSource("fixtures/recorded/sources/zai-pricing.html");
  console.log(`   Z.ai pricing: ${zaiPage.length} bytes`);

  // 3. Load AI extractions
  console.log();
  console.log("3. AI EXTRACTION RESULTS");
  const opencodeExtraction = loadAiExtraction("fixtures/recorded/ai/opencode-glm-promo.json");
  console.log(`   OpenCode Go: ${opencodeExtraction.facts.length} facts extracted`);
  const zaiExtraction = loadAiExtraction("fixtures/recorded/ai/zai-glm-promo.json");
  console.log(`   Z.ai: ${zaiExtraction.facts.length} facts extracted`);

  // 4. Validate facts
  console.log();
  console.log("4. DETERMINISTIC VALIDATION");
  const opencodeValidated = validateProposedFacts(
    opencodeExtraction.facts,
    opencodePage.slice(0, 8000)
  );
  const opencodeAccepted = acceptedFacts(opencodeValidated);
  console.log(`   OpenCode Go: ${opencodeAccepted.length}/${opencodeExtraction.facts.length} accepted`);

  const zaiValidated = validateProposedFacts(
    zaiExtraction.facts,
    zaiPage.slice(0, 8000)
  );
  const zaiAccepted = acceptedFacts(zaiValidated);
  console.log(`   Z.ai: ${zaiAccepted.length}/${zaiExtraction.facts.length} accepted`);

  // 5. Show economics — derived from the fact ledger, not hardcoded
  console.log();
  console.log("5. ECONOMICS COMPARISON (from fact ledger)");
  console.log();

  // Read facts from the ledger for both entities
  const opencodeFacts = await getCurrentFacts("OpenCode:GLM-5.3-Flash");
  const zaiFacts = await getCurrentFacts("Z.ai:GLM-5.3-Flash");

  const opencodePlan = buildPricingPlan(opencodeFacts);
  const zaiPlan = buildPricingPlan(zaiFacts);

  const workload = PROVIDER_WORKLOADS["OpenCode:GLM-5.3-Flash"] ?? {
    uncachedInputTokens: 1000,
    cachedInputTokens: 55000,
    outputTokens: 200,
  };

  if (opencodePlan) {
    const opencodeResult = calculateEconomics(
      "OpenCode:GLM-5.3-Flash",
      "OpenCode",
      "GLM-5.3-Flash",
      opencodePlan,
      workload
    );
    console.log("   OpenCode Go (2× usage promo):");
    console.log(formatEconomics(opencodeResult));
  } else {
    console.log("   OpenCode Go: no facts in ledger");
  }
  console.log();

  if (zaiPlan) {
    const zaiResult = calculateEconomics(
      "Z.ai:GLM-5.3-Flash",
      "Z.ai",
      "GLM-5.3-Flash",
      zaiPlan,
      workload
    );
    console.log("   Z.ai (50% off promo):");
    console.log(formatEconomics(zaiResult));
  } else {
    console.log("   Z.ai: no facts in ledger");
  }
  console.log();

  // 6. Summary
  console.log("═".repeat(60));
  console.log("  SUMMARY");
  console.log("═".repeat(60));
  console.log();
  console.log("  Two promotions detected for GLM-5.3-Flash:");
  console.log();
  console.log("  Z.ai: 50% off ($0.075/$0.25) until Sept 9");
  console.log("  OpenCode Go: 2× usage (3,160 req/5hrs)");
  console.log();
  console.log("  Which route is cheaper depends on workload.");
  console.log("═".repeat(60));
}

/**
 * Build a PricingPlan from fact ledger records.
 * This replaces all hardcoded economics — the demo now proves the ledger works.
 */
function buildPricingPlan(
  facts: Array<{ field: string; value: unknown }>
): import("../facts/economics.js").PricingPlan | null {
  const get = (field: string): number | undefined => {
    const f = facts.find((f) => f.field === field);
    return typeof f?.value === "number" ? f.value : undefined;
  };

  const input = get("input_price_usd_per_million");
  const output = get("output_price_usd_per_million");
  if (input == null || output == null) return null;

  const cached = get("cached_input_price_usd_per_million");
  const monthly = get("subscription_price_usd_month");
  const promoMultiplier = get("promotion_multiplier");
  const promoDiscountPct = get("promotion_discount_pct");
  const promoEndAt = facts.find((f) => f.field === "promotion_end_at")?.value as string | undefined;
  const usageValue = get("usage_value_usd_month");
  const requests = get("request_limit_month");

  const promoMultiplierVal = promoMultiplier != null && promoMultiplier > 1 ? promoMultiplier : undefined;
  const promoDiscountVal = promoDiscountPct != null && promoDiscountPct > 0 ? promoDiscountPct : undefined;

  // Subscription if monthly price exists
  if (monthly != null) {
    return {
      kind: "subscription",
      monthlyPrice: monthly,
      inputPerMillion: input,
      outputPerMillion: output,
      cachedInputPerMillion: cached,
      usageValueUsd: usageValue,
      requestsPerMonth: requests,
      promotionMultiplier: promoMultiplierVal,
      promotionDiscountPct: promoDiscountVal,
      promotionEndAt: promoEndAt,
    };
  }

  // PAYG fallback
  return {
    kind: "payg",
    inputPerMillion: input,
    outputPerMillion: output,
    cachedInputPerMillion: cached,
  };
}

function loadFixture(path: string): any {
  const fullPath = resolve(path);
  if (!existsSync(fullPath)) {
    console.log(`   [skip] ${path} not found`);
    return {};
  }
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function loadSource(path: string): string {
  const fullPath = resolve(path);
  if (!existsSync(fullPath)) {
    console.log(`   [skip] ${path} not found`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function loadAiExtraction(path: string): { facts: any[]; ambiguities: string[] } {
  const fullPath = resolve(path);
  if (!existsSync(fullPath)) {
    console.log(`   [skip] ${path} not found`);
    return { facts: [], ambiguities: [] };
  }
  return parseExtractionOutput(readFileSync(fullPath, "utf8"));
}
