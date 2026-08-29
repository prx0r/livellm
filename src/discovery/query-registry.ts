import type { SearchRequest } from "../search/types.js";

export type DiscoveryQuery = {
  id: string;
  purpose: string;
  request: SearchRequest;
  minIntervalHours: number;
  commercialValue: number;
};

export const QUERIES: DiscoveryQuery[] = [
  {
    id: "news-ai-api-economics",
    purpose: "Fresh API pricing/free tier/quota announcements",
    request: {
      engine: "google_news_light",
      q: '("AI API" OR "LLM API") (pricing OR "free tier" OR credits OR quota OR subscription)',
      params: { hl: "en", gl: "us" },
    },
    minIntervalHours: 24,
    commercialValue: 1.0,
  },
  {
    id: "news-coding-agent-plans",
    purpose: "Coding-agent subscription changes",
    request: {
      engine: "google_news_light",
      q: '("coding agent" OR "AI coding") (pricing OR plan OR subscription OR credits)',
      params: { hl: "en", gl: "us" },
    },
    minIntervalHours: 24,
    commercialValue: 1.0,
  },
  {
    id: "web-free-inference",
    purpose: "Unknown free inference/API credit offers",
    request: {
      engine: "google_light",
      q: '("free inference" OR "free API credits") (LLM OR "AI model")',
      params: { hl: "en", gl: "us" },
    },
    minIntervalHours: 72,
    commercialValue: 0.8,
  },
  {
    id: "weekly-deep-unknowns",
    purpose: "Unknown-unknown provider/product sweep",
    request: {
      engine: "search_index",
      q: "AI model API pricing free tier credits coding agent subscription",
      params: { mode: "deep" },
    },
    minIntervalHours: 84,
    commercialValue: 0.9,
  },
];
