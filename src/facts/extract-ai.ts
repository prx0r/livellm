/**
 * SPEC: AI structured fact extraction.
 *
 * Both live and replay paths go through the SAME validation pipeline.
 * Replay loads the external LLM response, not a pre-validated fact list.
 *
 * Pipeline:
 * 1. Build extraction prompt with provider/product/page content
 * 2. Call LLM (or load replay fixture — the raw LLM output, not validated facts)
 * 3. Parse raw JSON into ProposedFact[]
 * 4. Runtime schema validation (field enum check)
 * 5. Unit normalization and compatibility
 * 6. Deterministic fact validation (evidence, ranges, confidence)
 * 7. Return only accepted facts
 */

import type { ProposedFact, FactExtraction } from "./schema.js";
import { buildExtractionPrompt, parseExtractionOutput, VALID_FIELDS } from "./schema.js";
import { validateProposedFacts, acceptedFacts, normalizePrice, isUnitCompatible } from "./validate.js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

export type AiExtractorConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  replayDir?: string;
};

export type ExtractionResult = {
  facts: ProposedFact[];
  rawOutput: string;
  usedCache: boolean;
};

/**
 * SPEC: Process raw LLM output through the full validation pipeline.
 * This is the SINGLE entry point for both live and replay.
 */
function processExtractionOutput(
  rawOutput: string,
  sourceText: string
): { facts: ProposedFact[]; rejected: Array<{ fact: ProposedFact; reason: string }> } {
  // 1. Parse JSON
  const extraction = parseExtractionOutput(rawOutput);

  // 2. Runtime schema validation — reject unknown fields
  const schemaValid = extraction.facts.filter((f) => {
    if (!VALID_FIELDS.includes(f.field as any)) {
      return false; // Unknown field — silently drop
    }
    if (!f.entity || f.entity.length < 3) {
      return false; // Invalid entity
    }
    if (typeof f.confidence !== "number" || f.confidence < 0 || f.confidence > 1) {
      return false; // Invalid confidence
    }
    return true;
  });

  // 3. Unit normalization and compatibility
  const unitNormalized = schemaValid.map((f) => {
    if (typeof f.value === "number" && f.field.includes("price")) {
      const normalized = normalizePrice(f.value, f.unit);
      return { ...f, value: normalized.value, unit: normalized.unit };
    }
    return f;
  });

  // 4. Check unit/field compatibility
  const compatible = unitNormalized.filter((f) => {
    if (typeof f.value === "number") {
      return isUnitCompatible(f.field, f.unit);
    }
    return true;
  });

  // 5. Deterministic validation (evidence, ranges, confidence)
  const validated = validateProposedFacts(compatible, sourceText);
  const facts = acceptedFacts(validated);

  // Track rejected facts for debugging
  const rejected: Array<{ fact: ProposedFact; reason: string }> = [];
  for (const v of validated) {
    if (!v.validated) {
      rejected.push({ fact: v, reason: v.rejectionReason ?? "unknown" });
    }
  }

  return { facts, rejected };
}

/**
 * SPEC: Extract facts from official page content.
 *
 * Both live and replay use processExtractionOutput.
 * Replay loads the raw LLM output fixture, not pre-validated facts.
 */
export async function extractFacts(
  providerName: string,
  productName: string,
  pageContent: string,
  config: AiExtractorConfig = {}
): Promise<ExtractionResult> {
  let rawOutput: string;
  let usedCache = false;

  // Try replay first — loads RAW LLM output, not validated facts
  if (config.replayDir) {
    const replayRaw = tryReplayRaw(
      providerName,
      productName,
      config.replayDir
    );
    if (replayRaw !== null) {
      rawOutput = replayRaw;
      usedCache = true;
    } else {
      rawOutput = await callLlm(
        buildExtractionPrompt(providerName, productName, pageContent),
        config
      );
    }
  } else {
    rawOutput = await callLlm(
      buildExtractionPrompt(providerName, productName, pageContent),
      config
    );
  }

  // BOTH paths go through the same validation
  const { facts } = processExtractionOutput(rawOutput, pageContent);

  return { facts, rawOutput, usedCache };
}

/**
 * SPEC: Load raw LLM output from fixture (NOT pre-validated facts).
 */
function tryReplayRaw(
  providerName: string,
  productName: string,
  replayDir: string
): string | null {
  const fixtureName = `${providerName.toLowerCase()}_${productName.toLowerCase()}_extraction.json`;
  const fixturePath = resolve(replayDir, fixtureName);

  if (!existsSync(fixturePath)) return null;

  try {
    return readFileSync(fixturePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * SPEC: Call the LLM for extraction.
 */
async function callLlm(
  prompt: string,
  config: AiExtractorConfig
): Promise<string> {
  const apiKey = config.apiKey ?? process.env.OPENCODE_GO_API_KEY;
  const baseUrl = config.baseUrl ?? "https://opencode.ai/zen/go/v1";
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

  if (!res.ok) throw new Error(`LLM API HTTP ${res.status}`);
  const json = (await res.json()) as any;
  return json.choices?.[0]?.message?.content ?? "";
}

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
