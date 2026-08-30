/**
 * SPEC: Search Archive — retrieve past searches by ID.
 *
 * Every real SerpApi search stores search_metadata.id.
 * Archive API can retrieve JSON or HTML for up to 31 days.
 *
 * GET https://serpapi.com/searches/{SEARCH_ID}.json?api_key=...
 *
 * This enables:
 * - Reproducibility: "replay this exact search"
 * - Provenance: "this candidate came from search ID X"
 * - Audit: "the search returned Y at time T"
 */

export class SerpArchive {
  constructor(
    private apiKey: string,
    private baseUrl = "https://serpapi.com"
  ) {}

  /**
   * SPEC: Retrieve a past search by ID.
   * Returns the raw SerpApi response as it was at observation time.
   */
  async get(searchId: string): Promise<any> {
    const url = new URL(
      `/searches/${encodeURIComponent(searchId)}.json`,
      this.baseUrl
    );
    url.searchParams.set("api_key", this.apiKey);

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`Archive HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * SPEC: Check if a search exists in archive.
   * Useful before attempting retrieval.
   */
  async exists(searchId: string): Promise<boolean> {
    try {
      const url = new URL(
        `/searches/${encodeURIComponent(searchId)}.json`,
        this.baseUrl
      );
      url.searchParams.set("api_key", this.apiKey);

      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });

      return res.ok;
    } catch {
      return false;
    }
  }
}

/**
 * SPEC: Provenance record for a search result.
 * Links a candidate/fact back to its discovery search.
 */
export type ProvenanceRecord = {
  searchId: string;
  engine: string;
  query: string;
  resultPosition?: number;
  resultUrl: string;
  observedAt: string;
  archivedAt?: string;
};

/**
 * SPEC: Build provenance from search run and result.
 */
export function buildProvenance(params: {
  searchId: string;
  engine: string;
  query: string;
  position?: number;
  url: string;
  observedAt: string;
}): ProvenanceRecord {
  return {
    searchId: params.searchId,
    engine: params.engine,
    query: params.query,
    resultPosition: params.position,
    resultUrl: params.url,
    observedAt: params.observedAt,
  };
}
