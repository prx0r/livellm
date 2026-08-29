import crypto from "node:crypto";
import type { SearchRequest } from "./types.js";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)])
    );
  }
  return value;
}

export function canonicalRequest(request: SearchRequest) {
  const normalized = {
    engine: request.engine,
    q: request.q.trim().replace(/\s+/g, " "),
    params: stable(request.params ?? {}),
  };
  return JSON.stringify(normalized);
}

export function requestHash(request: SearchRequest) {
  return crypto.createHash("sha256").update(canonicalRequest(request)).digest("hex");
}
