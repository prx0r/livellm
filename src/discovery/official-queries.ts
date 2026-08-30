import type { SearchRequest } from "../search/types.js";

/**
 * SPEC: Official-source discovery queries.
 * These use site: operators to find authoritative pricing pages.
 * Each search costs 1 credit but directly targets known providers.
 */

export type OfficialQuery = {
  id: string;
  provider: string;
  purpose: string;
  request: SearchRequest;
};

export const OFFICIAL_QUERIES: OfficialQuery[] = [
  {
    id: "official-openai",
    provider: "OpenAI",
    purpose: "OpenAI API pricing page",
    request: {
      engine: "google_light",
      q: "site:openai.com API pricing",
      params: { hl: "en", gl: "us" },
    },
  },
  {
    id: "official-anthropic",
    provider: "Anthropic",
    purpose: "Anthropic API pricing page",
    request: {
      engine: "google_light",
      q: "site:anthropic.com OR site:console.anthropic.com pricing",
      params: { hl: "en", gl: "us" },
    },
  },
  {
    id: "official-google",
    provider: "Google",
    purpose: "Google AI/Gemini pricing page",
    request: {
      engine: "google_light",
      q: "site:ai.google.dev OR site:cloud.google.com Gemini API pricing",
      params: { hl: "en", gl: "us" },
    },
  },
  {
    id: "official-deepseek",
    provider: "DeepSeek",
    purpose: "DeepSeek API pricing page",
    request: {
      engine: "google_light",
      q: "site:platform.deepseek.com OR site:deepseek.com API pricing",
      params: { hl: "en", gl: "us" },
    },
  },
  {
    id: "official-groq",
    provider: "Groq",
    purpose: "Groq rate limits and pricing",
    request: {
      engine: "google_light",
      q: "site:console.groq.com rate limits pricing",
      params: { hl: "en", gl: "us" },
    },
  },
  {
    id: "official-mistral",
    provider: "Mistral",
    purpose: "Mistral API pricing",
    request: {
      engine: "google_light",
      q: "site:mistral.ai OR site:console.mistral.ai pricing",
      params: { hl: "en", gl: "us" },
    },
  },
  {
    id: "official-cursor",
    provider: "Cursor",
    purpose: "Cursor subscription pricing",
    request: {
      engine: "google_light",
      q: "site:cursor.sh pricing plan subscription",
      params: { hl: "en", gl: "us" },
    },
  },
  {
    id: "official-github-copilot",
    provider: "GitHub",
    purpose: "GitHub Copilot pricing",
    request: {
      engine: "google_light",
      q: "site:github.com copilot pricing plan",
      params: { hl: "en", gl: "us" },
    },
  },
];
