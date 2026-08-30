/**
 * SPEC: AI structured fact extraction.
 *
 * This module calls the LLM to extract pricing/quota facts from official pages.
 * In replay mode, it uses recorded LLM responses.
 *
 * Pipeline:
 * 1. Build extraction prompt with provider/product/page content
 * 2. Call LLM (or load replay fixture)
 * 3. Parse output into ProposedFact[]
 * 4. Validate deterministically
 * 5. Return only accepted facts
 */

import type { ProposedFact, FactExtraction } from "./schema.js";
import { buildExtractionPrompt, parseExtractionOutput } from "./schema.js";
import { validateProposedFacts, acceptedFacts } from "./validate.js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export type AiExtractorConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  replayDir?: string;
};

/**
 * SPEC: Expected LLM response format.
 * The model must return valid JSON matching FactExtraction.
 */
export type ExtractionResult = {
  facts: ProposedFact[];
  rawOutput: string;
  usedCache: boolean;
};

/**
 * SPEC: Extract facts from official page content.
 *
 * In production:
 * - Sends page content to LLM with extraction prompt
 * - LLM returns structured JSON
 * - Deterministic validator filters
 *
 * In replay mode:
 * - Loads pre-recorded LLM response from fixture
 * - Zero API cost
 */
export async function extractFacts(
  providerName: string,
  productName: string,
  pageContent: string,
  config: AiExtractorConfig = {}
): Promise<ExtractionResult> {
  // Try replay first
  if (config.replayDir) {
    const replayResult = tryReplay(
      providerName,
      productName,
      config.replayDir
    );
    if (replayResult) return replayResult;
  }

  // Live extraction
  const prompt = buildExtractionPrompt(providerName, productName, pageContent);
  const rawOutput = await callLlm(prompt, config);

  // Parse
  const extraction = parseExtractionOutput(rawOutput);

  // Validate against source text
  const validated = validateProposedFacts(extraction.facts, pageContent);
  const facts = acceptedFacts(validated);

  return {
    facts,
    rawOutput,
    usedCache: false,
  };
}

/**
 * SPEC: Call the LLM for extraction.
 * Uses OpenAI-compatible API.
 */
async function callLlm(
  prompt: string,
  config: AiExtractorConfig
): Promise<string> {
  const apiKey = config.apiKey ?? process.env.OPENCODE_GO_API_KEY;
  const baseUrl =
    config.baseUrl ?? "https://opencode.ai/zen/go/v1";
  const model = config.model ?? "mimo-v2.5";

  if (!apiKey) {
    throw new Error("OPENCODE_GO_API_KEY missing for AI extraction");
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM API HTTP ${res.status}`);
  }

  const json = (await res.json()) as any;
  return json.choices?.[0]?.message?.content ?? "";
}

/**
 * SPEC: Try loading a replay fixture for AI extraction.
 * This lets us test the full pipeline without LLM calls.
 */
function tryReplay(
  providerName: string,
  productName: string,
  replayDir: string
): ExtractionResult | null {
  const fixtureName = `${providerName.toLowerCase()}_${productName.toLowerCase()}_extraction.json`;
  const fixturePath = resolve(replayDir, fixtureName);

  if (!existsSync(fixturePath)) return null;

  try {
    const raw = readFileSync(fixturePath, "utf8");
    const extraction = parseExtractionOutput(raw);

    return {
      facts: extraction.facts,
      rawOutput: raw,
      usedCache: true,
    };
  } catch {
    return null;
  }
}

/**
 * SPEC: Record an AI extraction for future replay.
 */
export function recordExtraction(
  providerName: string,
  productName: string,
  output: string,
  replayDir: string
): void {
  mkdirSync(replayDir, { recursive: true });
  const fixtureName = `${providerName.toLowerCase()}_${productName.toLowerCase()}_extraction.json`;
  writeFileSync(resolve(replayDir, fixtureName), output);
}
