import type {
  SearchEngine,
  SearchHit,
  SearchEnvelope,
  SearchSource,
} from "./types.js";

type SerpRaw = {
  search_metadata?: {
    id?: string;
    status?: string;
    created_at?: string;
    processed_at?: string;
  };
  organic_results?: Array<any>;
  news_results?: Array<any>;
  related_questions?: Array<any>;
  related_searches?: Array<any>;
  top_stories?: Array<any>;
  error?: string;
};

/**
 * SPEC: Normalizes raw SerpApi response into our SearchEnvelope.
 *
 * Key design decisions:
 *
 * 1. Source object handling (Google News bug fix):
 *    Full google_news returns `source` as an OBJECT { name, icon, authors }
 *    not a string. We must handle both.
 *
 * 2. Date handling:
 *    google_news returns `iso_date` (ISO 8601)
 *    google_news_light returns `date` (human-readable)
 *    We normalize to `publishedAt` (ISO) + `publishedAtRaw` (original)
 *
 * 3. Engine-specific fields:
 *    google_light returns: organic_results, related_questions, related_searches
 *    google_news_light returns: news_results
 *    google_news returns: news_results (with source objects)
 *    search_index returns: organic_results
 */
export function normalizeResponse(
  raw: SerpRaw,
  engine: SearchEngine,
  query: string
): SearchEnvelope {
  // Pick the right result array
  const rawRows = raw.news_results ?? raw.organic_results ?? [];

  // Normalize hits
  const results: SearchHit[] = rawRows
    .filter((r: any) => r?.link && r?.title)
    .map((r: any) => {
      // Source can be string OR object
      let source: SearchSource | undefined;
      if (r.source) {
        if (typeof r.source === "string") {
          source = { name: r.source };
        } else if (typeof r.source === "object") {
          source = {
            name: r.source.name,
            authors: r.source.authors,
            icon: r.source.icon,
          };
        }
      }

      // Date normalization
      const publishedAt = r.iso_date ?? r.date ?? undefined;
      const publishedAtRaw = r.date ?? undefined;

      return {
        position: typeof r.position === "number" ? r.position : undefined,
        title: String(r.title),
        url: String(r.link),
        snippet: r.snippet ? String(r.snippet) : undefined,
        source,
        publishedAt,
        publishedAtRaw,
      };
    });

  // Related questions (google_light)
  const relatedQuestions = (raw.related_questions ?? []).map((q: any) => ({
    question: q.question ?? q.query ?? "",
    snippet: q.snippet ?? undefined,
    link: q.link ?? undefined,
  }));

  // Related searches (google_light)
  const relatedSearches = (raw.related_searches ?? []).map((s: any) => ({
    query: s.query ?? s.replacement ?? "",
  }));

  return {
    results,
    relatedQuestions: relatedQuestions.length ? relatedQuestions : undefined,
    relatedSearches: relatedSearches.length ? relatedSearches : undefined,
    metadata: {
      searchId: raw.search_metadata?.id,
      status: raw.search_metadata?.status,
      engine,
      query,
      processedAt: raw.search_metadata?.processed_at,
    },
  };
}
