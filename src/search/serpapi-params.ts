import type { SearchEngine, SearchRequest, FreshnessPolicy } from "./types.js";

/**
 * SPEC: Translates our SearchRequest into SerpApi URL parameters.
 *
 * Engine mapping:
 *   google_light      → engine=google_light
 *   google_news_light → engine=google_news_light
 *   google_news       → engine=google_news (full, with source objects)
 *   search_index      → engine=search_index
 *
 * Freshness policy mapping:
 *   cache_ok    → no param (SerpApi caches identical queries for 1 hour)
 *   force_fresh → no_cache=true
 *   replay      → should never reach here (replay provider handles it)
 *
 * Special params:
 *   nfpr=1 — exclude auto-corrected queries (for obscure model names)
 *   filter=0 — disable similar-result filtering (increase recall)
 */
export function buildSerpApiParams(
  request: SearchRequest,
  freshness: FreshnessPolicy = "cache_ok"
): Record<string, string> {
  const params: Record<string, string> = {
    engine: request.engine,
    q: request.q,
  };

  // Apply freshness policy
  if (freshness === "force_fresh") {
    params.no_cache = "true";
  }

  // Merge caller params (caller can override)
  for (const [k, v] of Object.entries(request.params ?? {})) {
    params[k] = String(v);
  }

  return params;
}

/**
 * SPEC: Returns the correct SerpApi endpoint for the engine.
 * All engines use /search.json for JSON mode.
 * For Markdown mode, use /search.md or set output=md.
 */
export function getEndpoint(
  engine: SearchEngine,
  format: "json" | "md" = "json"
): string {
  if (format === "md") return "https://serpapi.com/search.md";
  return "https://serpapi.com/search.json";
}
