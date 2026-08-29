import type { SearchProvider, SearchRequest, SearchResponse } from "./types";
import { requestHash } from "./canonical-request";

export interface CacheStore {
  get(key: string): Promise<{ expiresAt: number; value: SearchResponse } | null>;
  put(key: string, expiresAt: number, value: SearchResponse): Promise<void>;
}

const inflight = new Map<string, Promise<SearchResponse>>();

export class CachedSearchProvider implements SearchProvider {
  constructor(
    private inner: SearchProvider,
    private cache: CacheStore,
    private ttlMs = 60 * 60 * 1000
  ) {}

  async search(request: SearchRequest): Promise<SearchResponse> {
    const key = requestHash(request);
    const cached = await this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.value, fromCache: true };
    }

    const existing = inflight.get(key);
    if (existing) return existing;

    const promise = this.inner.search(request)
      .then(async (value) => {
        await this.cache.put(key, Date.now() + this.ttlMs, value);
        return value;
      })
      .finally(() => inflight.delete(key));

    inflight.set(key, promise);
    return promise;
  }
}
