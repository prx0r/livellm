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
 *   json_restrictor — reduce response payload to selected fields
 */
export function buildSerpApiParams(
  request: SearchRequest,
  freshness: FreshnessPolicy = "cache_ok"
): Record<string, string> {
  const params: Record<string, string> = {
    engine: request.engine,
    q: request.q,
  };

  // Merge caller params FIRST
  for (const [k, v] of Object.entries(request.params ?? {})) {
    params[k] = String(v);
  }

  // Apply JSON Restrictor if not already set by caller
  if (!params.json_restrictor) {
    params.json_restrictor = buildRestrictor(request.engine);
  }

  // Enforce freshness policy AFTER (can't be overridden by caller)
  if (freshness === "force_fresh") {
    params.no_cache = "true";
  }

  // Reject async + no_cache (SerpApi constraint)
  if (params.async === "true" && params.no_cache === "true") {
    throw new Error("SerpApi does not allow async=true with no_cache=true");
  }

  return params;
}

/**
 * SPEC: Build JSON Restrictor string per engine.
 * Reduces response payload by requesting only the fields we need.
 */
function buildRestrictor(engine: SearchEngine): string {
  switch (engine) {
    case "google_news_light":
      return "search_metadata.id,search_metadata.status,news_results[].position,news_results[].title,news_results[].link,news_results[].snippet,news_results[].source,news_results[].date";
    case "google_light":
      return "search_metadata.id,search_metadata.status,organic_results[].position,organic_results[].title,organic_results[].link,organic_results[].snippet,related_questions[].question,related_searches[].query";
    case "search_index":
      return "search_metadata.id,search_metadata.status,organic_results[].position,organic_results[].title,organic_results[].link,organic_results[].snippet";
    default:
      return "search_metadata.id,search_metadata.status,organic_results[].position,organic_results[].title,organic_results[].link,organic_results[].snippet";
  }
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
