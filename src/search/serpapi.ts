import type {
  SearchProvider,
  SearchRequest,
  SearchResponse,
  FreshnessPolicy,
} from "./types.js";
import { buildSerpApiParams, getEndpoint } from "./serpapi-params.js";
import { normalizeResponse } from "./serpapi-normalize.js";

export type SerpApiConfig = {
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

/**
 * SPEC: Hardened SerpApi client.
 *
 * Features:
 * - AbortController timeout (default 30s)
 * - Retry with exponential backoff for transient failures
 * - Proper error classification (transient vs permanent)
 * - Freshness policy translation
 * - JSON and Markdown support (separate methods)
 * - Search metadata extraction
 *
 * What we DON'T do yet (CP9):
 * - Search Archive retrieval
 * - Async search submission
 *
 * Retry policy:
 * - 429 (rate limit) → retry with backoff
 * - 500-599 → retry with backoff
 * - Network/timeout → retry with backoff
 * - 400-499 (except 429) → fail immediately
 * - SerpApi error field → fail immediately
 */
export class SerpApiProvider implements SearchProvider {
  private apiKey: string;
  private timeoutMs: number;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config?: SerpApiConfig) {
    this.apiKey = config?.apiKey ?? process.env.SERPAPI_API_KEY ?? "";
    if (!this.apiKey) throw new Error("SERPAPI_API_KEY missing");
    this.timeoutMs = config?.timeoutMs ?? 30_000;
    this.maxRetries = config?.maxRetries ?? 2;
    this.retryDelayMs = config?.retryDelayMs ?? 1000;
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const freshness = request.freshness ?? "cache_ok";
    if (freshness === "replay") {
      throw new Error("SerpApiProvider does not handle replay mode");
    }

    const params = buildSerpApiParams(request, freshness);
    const endpoint = getEndpoint(request.engine, "json");

    const raw = await this.fetchWithRetry(endpoint, params);

    const envelope = normalizeResponse(raw, request.engine, request.q);

    return {
      request,
      searchId: envelope.metadata.searchId,
      fromCache: freshness === "cache_ok",
      cacheSource: freshness === "cache_ok" ? "serpapi_cache" : "live",
      hits: envelope.results,
      envelope,
      raw,
    };
  }

  /**
   * SPEC: Markdown search — returns raw markdown text.
   * Useful for AI consumption (50%+ token savings).
   *
   * Expected SerpApi behavior:
   * - Set output=md or use /search.md endpoint
   * - Returns text/markdown content type
   * - Same search semantics, different representation
   */
  async searchMarkdown(request: SearchRequest): Promise<string> {
    const freshness = request.freshness ?? "cache_ok";
    const params = buildSerpApiParams(request, freshness);
    const endpoint = getEndpoint(request.engine, "md");

    const url = new URL(endpoint);
    url.searchParams.set("api_key", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchWithRetry(
    endpoint: string,
    params: Record<string, string>
  ): Promise<any> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }

      const url = new URL(endpoint);
      url.searchParams.set("api_key", this.apiKey);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          const err = new Error(`SerpApi HTTP ${res.status}`);
          if (this.isRetryable(res.status)) {
            lastError = err;
            continue;
          }
          throw err;
        }

        const json = await res.json();
        if (json.error) {
          throw new Error(`SerpApi: ${json.error}`);
        }
        return json;
      } catch (err: any) {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
          lastError = new Error("SerpApi request timed out");
          continue;
        }
        if (this.isRetryableNetwork(err)) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastError ?? new Error("SerpApi: max retries exceeded");
  }

  private isRetryable(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }

  private isRetryableNetwork(err: Error): boolean {
    return (
      err.name === "TypeError" && // fetch throws TypeError on network error
      (err.message.includes("fetch") || err.message.includes("network"))
    );
  }
}

/**
 * SPEC: Account API — check quota status.
 *
 * Expected response:
 * {
 *   "total_searches_left": 219,
 *   "plan_searches_left": 219,
 *   "searches_per_month": 500,
 *   "this_month_usage": 281,
 *   "this_hour_searches": 0,
 *   "account_rate_limit_per_hour": 10,
 *   "plan_renewal_date": "2026-09-15"
 * }
 */
export async function getSerpApiAccount(apiKey?: string): Promise<any> {
  const key = apiKey ?? process.env.SERPAPI_API_KEY;
  if (!key) throw new Error("SERPAPI_API_KEY missing");
  const url = new URL("https://serpapi.com/account.json");
  url.searchParams.set("api_key", key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi Account HTTP ${res.status}`);
  return res.json();
}

/**
 * SPEC: Budget calculation.
 *
 * Rules:
 * - Never spend below the reserve
 * - Tighten budget when running low
 * - Return 0 if insufficient credits
 */
export function allowedPaidBatch(
  searchesLeft: number,
  configuredBudget: number,
  reserve = 20
): number {
  if (searchesLeft <= reserve) return 0;
  const available = searchesLeft - reserve;
  if (searchesLeft <= 50) return Math.min(1, configuredBudget, available);
  if (searchesLeft <= 100) return Math.min(2, configuredBudget, available);
  return Math.min(configuredBudget, available);
}
