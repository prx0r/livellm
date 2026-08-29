import crypto from "node:crypto";

export function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function normalizeText(htmlOrText: string) {
  return htmlOrText
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function observationHashes(raw: string, relevantText?: string) {
  const normalized = normalizeText(raw);
  return {
    rawHash: sha256(raw),
    normalizedHash: sha256(normalized),
    relevantHash: sha256(relevantText ?? normalized),
  };
}
