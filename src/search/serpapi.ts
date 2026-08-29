import type { SearchProvider, SearchRequest, SearchResponse, SearchHit } from "./types";

type SerpRaw = {
  search_metadata?: { id?: string; status?: string };
  organic_results?: Array<any>;
  news_results?: Array<any>;
  error?: string;
};

export class SerpApiProvider implements SearchProvider {
  constructor(private apiKey = process.env.SERPAPI_API_KEY) {
    if (!this.apiKey) throw new Error("SERPAPI_API_KEY missing");
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("api_key", this.apiKey!);
    url.searchParams.set("engine", request.engine);
    url.searchParams.set("q", request.q);

    // Critical: do NOT set no_cache=true. Exact-query SerpApi cache can be free.
    for (const [k, v] of Object.entries(request.params ?? {})) {
      url.searchParams.set(k, String(v));
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
    const raw = (await res.json()) as SerpRaw;
    if (raw.error) throw new Error(raw.error);

    const rows = raw.news_results ?? raw.organic_results ?? [];
    const hits: SearchHit[] = rows
      .filter((r: any) => r?.link && r?.title)
      .map((r: any) => ({
        position: typeof r.position === "number" ? r.position : undefined,
        title: String(r.title),
        url: String(r.link),
        snippet: r.snippet ? String(r.snippet) : undefined,
        source: r.source ? String(r.source) : undefined,
        date: r.date ? String(r.date) : undefined,
      }));

    return {
      request,
      searchId: raw.search_metadata?.id,
      fromCache: false, // local cache wrapper should mark its own hits.
      hits,
      raw,
    };
  }
}
