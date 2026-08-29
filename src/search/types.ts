export type SearchEngine =
  | "google_light"
  | "google_news_light"
  | "google_news"
  | "search_index";

export type SearchRequest = {
  engine: SearchEngine;
  q: string;
  params?: Record<string, string | number | boolean>;
};

export type SearchHit = {
  position?: number;
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  date?: string;
};

export type SearchResponse = {
  request: SearchRequest;
  searchId?: string;
  fromCache: boolean;
  hits: SearchHit[];
  raw?: unknown;
};

export interface SearchProvider {
  search(request: SearchRequest): Promise<SearchResponse>;
}
