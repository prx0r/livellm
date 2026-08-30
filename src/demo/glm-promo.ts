/**
 * SPEC: GLM-5.3-Flash promotion replay demo.
 * Demonstrates the full pipeline with recorded fixtures.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseExtractionOutput } from "../facts/schema.js";
import { validateProposedFacts, acceptedFacts } from "../facts/validate.js";
import { calculateEconomics, formatEconomics, PROVIDER_WORKLOADS } from "../facts/economics.js";

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

  // 5. Show economics
  console.log();
  console.log("5. ECONOMICS COMPARISON");
  console.log();

  // OpenCode Go route
  const opencodeResult = calculateEconomics(
    "OpenCode Go:GLM-5.3-Flash",
    "OpenCode Go",
    "GLM-5.3-Flash",
    {
      kind: "subscription",
      monthlyPrice: 10,
      inputPerMillion: 0.15,
      outputPerMillion: 0.5,
      cachedInputPerMillion: 0.03,
      usageValueUsd: 30,
      requestsPerMonth: 15800,
      promotionMultiplier: 2,
    },
    PROVIDER_WORKLOADS["OpenCode:GLM-5.3-Flash"] ?? {
      uncachedInputTokens: 1000,
      cachedInputTokens: 55000,
      outputTokens: 200,
    }
  );
  console.log("   OpenCode Go (2× usage promo):");
  console.log(formatEconomics(opencodeResult));
  console.log();

  // Z.ai PAYG route
  const zaiResult = calculateEconomics(
    "Z.ai:GLM-5.3-Flash",
    "Z.ai",
    "GLM-5.3-Flash",
    {
      kind: "payg",
      inputPerMillion: 0.075,
      outputPerMillion: 0.25,
      cachedInputPerMillion: 0.015,
    },
    PROVIDER_WORKLOADS["OpenCode:GLM-5.3-Flash"] ?? {
      uncachedInputTokens: 1000,
      cachedInputTokens: 55000,
      outputTokens: 200,
    }
  );
  console.log("   Z.ai (50% off promo):");
  console.log(formatEconomics(zaiResult));
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
