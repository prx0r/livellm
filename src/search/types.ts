export type SearchEngine =
  | "google_light"
  | "google_news_light"
  | "google_news"
  | "search_index"
  | "google_trends"
  | "google_ai_mode"
  | "google_ai_overview";

export type FreshnessPolicy =
  | "cache_ok"       // Use SerpApi's 1-hour cache
  | "force_fresh"    // no_cache=true, costs a search credit
  | "replay";        // Use recorded fixtures only

export type SearchRequest = {
  engine: SearchEngine;
  q: string;
  params?: Record<string, string | number | boolean>;
  freshness?: FreshnessPolicy;
};

export type SearchSource = {
  name?: string;
  authors?: string[];
  icon?: string;
};

export type SearchHit = {
  position?: number;
  title: string;
  url: string;
  snippet?: string;
  source?: SearchSource;
  publishedAt?: string;      // ISO 8601
  publishedAtRaw?: string;   // Original SerpApi field
};

export type SearchEnvelope = {
  results: SearchHit[];
  relatedQuestions?: Array<{ question: string; snippet?: string; link?: string }>;
  relatedSearches?: Array<{ query: string }>;
  topStories?: SearchHit[];
  latestFrom?: SearchHit[];
  aiOverview?: { text: string; references: string[] };
  metadata: {
    searchId?: string;
    status?: string;
    engine: SearchEngine;
    query: string;
    processedAt?: string;
    durationMs?: number;
  };
};

export type SearchResponse = {
  request: SearchRequest;
  searchId?: string;
  fromCache: boolean;
  cacheSource?: "serpapi_cache" | "local_cache" | "replay" | "live";
  hits: SearchHit[];
  envelope?: SearchEnvelope;
  raw?: unknown;
};

export interface SearchProvider {
  search(request: SearchRequest): Promise<SearchResponse>;
}
