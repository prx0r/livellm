/**
 * SPEC: Synthetic fixtures for replay testing.
 *
 * These match the exact SerpApi response shapes:
 * - google_news_light: { search_metadata, news_results[] }
 * - google_light: { search_metadata, organic_results[], related_questions[], related_searches[] }
 * - search_index: { search_metadata, organic_results[] }
 *
 * Each fixture is named by the SHA-256 of its canonical request.
 * To generate a fixture for a new query:
 * 1. Build the SearchRequest
 * 2. Compute requestHash(request)
 * 3. Save as {hash}.json with the SearchResponse shape
 *
 * These fixtures are synthetic but structurally valid.
 * They test: URL canonicalization, prefilter scoring, candidate detection.
 */

export const FIXTURES = {
  "news-ai-api-economics": {
    request: {
      engine: "google_news_light",
      q: '("AI API" OR "LLM API") (pricing OR "free tier" OR credits OR quota OR subscription)',
      params: { hl: "en", gl: "us" },
    },
    response: {
      request: {
        engine: "google_news_light",
        q: '("AI API" OR "LLM API") (pricing OR "free tier" OR credits OR quota OR subscription)',
        params: { hl: "en", gl: "us" },
      },
      searchId: "synthetic_news_economics_001",
      fromCache: false,
      cacheSource: "replay",
      hits: [
        {
          position: 1,
          title: "OpenAI Cuts GPT-4 API Pricing by 50%",
          url: "https://techcrunch.com/2026/08/28/openai-cuts-gpt4-api-pricing",
          snippet: "OpenAI announced a 50% reduction in GPT-4 API pricing, bringing the cost down to $0.01 per 1K tokens for input.",
          source: { name: "TechCrunch" },
          publishedAt: "2026-08-28T14:00:00Z",
          publishedAtRaw: "Aug 28, 2026",
        },
        {
          position: 2,
          title: "Anthropic Introduces Free Tier for Claude API",
          url: "https://theverge.com/2026/08/27/anthropic-free-tier-claude",
          snippet: "Anthropic launches a free tier for Claude API with 100K tokens per day quota for developers.",
          source: { name: "The Verge" },
          publishedAt: "2026-08-27T10:00:00Z",
          publishedAtRaw: "Aug 27, 2026",
        },
        {
          position: 3,
          title: "Google Gemini API Pricing Comparison 2026",
          url: "https://arstechnica.com/2026/08/26/gemini-api-pricing",
          snippet: "A comprehensive comparison of Google Gemini API pricing tiers and free quota limits.",
          source: { name: "Ars Technica" },
          publishedAt: "2026-08-26T08:00:00Z",
          publishedAtRaw: "Aug 26, 2026",
        },
        {
          position: 4,
          title: "LLM API Rate Limits Explained",
          url: "https://medium.com/@dev/llm-rate-limits-2026",
          snippet: "Tutorial on understanding LLM API rate limits and how to handle them in production.",
          source: { name: "Medium" },
          publishedAt: "2026-08-25T12:00:00Z",
          publishedAtRaw: "Aug 25, 2026",
        },
        {
          position: 5,
          title: "Mistral AI Launches Developer Credits Program",
          url: "https://venturebeat.com/2026/08/28/mistral-developer-credits",
          snippet: "Mistral AI announces $10M in developer credits for new API users, with 50K free tokens monthly.",
          source: { name: "VentureBeat" },
          publishedAt: "2026-08-28T16:00:00Z",
          publishedAtRaw: "Aug 28, 2026",
        },
      ],
      raw: {
        search_metadata: {
          id: "synthetic_news_economics_001",
          status: "Success",
        },
        news_results: [
          {
            position: 1,
            title: "OpenAI Cuts GPT-4 API Pricing by 50%",
            link: "https://techcrunch.com/2026/08/28/openai-cuts-gpt4-api-pricing",
            snippet: "OpenAI announced a 50% reduction in GPT-4 API pricing, bringing the cost down to $0.01 per 1K tokens for input.",
            source: { name: "TechCrunch" },
            iso_date: "2026-08-28T14:00:00Z",
            date: "Aug 28, 2026",
          },
          {
            position: 2,
            title: "Anthropic Introduces Free Tier for Claude API",
            link: "https://theverge.com/2026/08/27/anthropic-free-tier-claude",
            snippet: "Anthropic launches a free tier for Claude API with 100K tokens per day quota for developers.",
            source: { name: "The Verge" },
            iso_date: "2026-08-27T10:00:00Z",
            date: "Aug 27, 2026",
          },
          {
            position: 3,
            title: "Google Gemini API Pricing Comparison 2026",
            link: "https://arstechnica.com/2026/08/26/gemini-api-pricing",
            snippet: "A comprehensive comparison of Google Gemini API pricing tiers and free quota limits.",
            source: { name: "Ars Technica" },
            iso_date: "2026-08-26T08:00:00Z",
            date: "Aug 26, 2026",
          },
          {
            position: 4,
            title: "LLM API Rate Limits Explained",
            link: "https://medium.com/@dev/llm-rate-limits-2026",
            snippet: "Tutorial on understanding LLM API rate limits and how to handle them in production.",
            source: { name: "Medium" },
            iso_date: "2026-08-25T12:00:00Z",
            date: "Aug 25, 2026",
          },
          {
            position: 5,
            title: "Mistral AI Launches Developer Credits Program",
            link: "https://venturebeat.com/2026/08/28/mistral-developer-credits",
            snippet: "Mistral AI announces $10M in developer credits for new API users, with 50K free tokens monthly.",
            source: { name: "VentureBeat" },
            iso_date: "2026-08-28T16:00:00Z",
            date: "Aug 28, 2026",
          },
        ],
      },
    },
  },

  "news-coding-agent-plans": {
    request: {
      engine: "google_news_light",
      q: '("coding agent" OR "AI coding") (pricing OR plan OR subscription OR credits)',
      params: { hl: "en", gl: "us" },
    },
    response: {
      request: {
        engine: "google_news_light",
        q: '("coding agent" OR "AI coding") (pricing OR plan OR subscription OR credits)',
        params: { hl: "en", gl: "us" },
      },
      searchId: "synthetic_news_coding_002",
      fromCache: false,
      cacheSource: "replay",
      hits: [
        {
          position: 1,
          title: "Cursor Introduces Pro Plan at $20/month",
          url: "https://cursor.sh/blog/pro-plan",
          snippet: "Cursor launches Pro plan with unlimited completions and priority access for $20/month subscription.",
          source: { name: "Cursor Blog" },
          publishedAt: "2026-08-28T09:00:00Z",
          publishedAtRaw: "Aug 28, 2026",
        },
        {
          position: 2,
          title: "GitHub Copilot Free Tier Limits Changed",
          url: "https://github.blog/2026-08-27-copilot-free-tier",
          snippet: "GitHub updates Copilot free tier: 2000 completions and 50 chat messages per month.",
          source: { name: "GitHub Blog" },
          publishedAt: "2026-08-27T11:00:00Z",
          publishedAtRaw: "Aug 27, 2026",
        },
        {
          position: 3,
          title: "Windsurf AI Coding Agent Pricing Review",
          url: "https://dev.to/review/windsurf-pricing-2026",
          snippet: "Review of Windsurf AI coding agent pricing and subscription tiers.",
          source: { name: "DEV.to" },
          publishedAt: "2026-08-26T15:00:00Z",
          publishedAtRaw: "Aug 26, 2026",
        },
      ],
      raw: {
        search_metadata: { id: "synthetic_news_coding_002", status: "Success" },
        news_results: [
          {
            position: 1,
            title: "Cursor Introduces Pro Plan at $20/month",
            link: "https://cursor.sh/blog/pro-plan",
            snippet: "Cursor launches Pro plan with unlimited completions and priority access for $20/month subscription.",
            source: { name: "Cursor Blog" },
            iso_date: "2026-08-28T09:00:00Z",
            date: "Aug 28, 2026",
          },
          {
            position: 2,
            title: "GitHub Copilot Free Tier Limits Changed",
            link: "https://github.blog/2026-08-27-copilot-free-tier",
            snippet: "GitHub updates Copilot free tier: 2000 completions and 50 chat messages per month.",
            source: { name: "GitHub Blog" },
            iso_date: "2026-08-27T11:00:00Z",
            date: "Aug 27, 2026",
          },
          {
            position: 3,
            title: "Windsurf AI Coding Agent Pricing Review",
            link: "https://dev.to/review/windsurf-pricing-2026",
            snippet: "Review of Windsurf AI coding agent pricing and subscription tiers.",
            source: { name: "DEV.to" },
            iso_date: "2026-08-26T15:00:00Z",
            date: "Aug 26, 2026",
          },
        ],
      },
    },
  },

  "web-free-inference": {
    request: {
      engine: "google_light",
      q: '("free inference" OR "free API credits") (LLM OR "AI model")',
      params: { hl: "en", gl: "us" },
    },
    response: {
      request: {
        engine: "google_light",
        q: '("free inference" OR "free API credits") (LLM OR "AI model")',
        params: { hl: "en", gl: "us" },
      },
      searchId: "synthetic_light_free_003",
      fromCache: false,
      cacheSource: "replay",
      hits: [
        {
          position: 1,
          title: "Free LLM API Credits Comparison 2026",
          url: "https://llmprice.com/free-credits",
          snippet: "Compare free API credits from OpenAI, Anthropic, Google, Mistral and more.",
          publishedAt: "2026-08-20T10:00:00Z",
        },
        {
          position: 2,
          title: "Groq Free Inference Tier — 10K Tokens/Day",
          url: "https://groq.com/free-tier",
          snippet: "Groq offers free inference with 10K tokens per day on Llama 3 models.",
          publishedAt: "2026-08-15T08:00:00Z",
        },
      ],
      envelope: {
        results: [],
        relatedQuestions: [
          { question: "Which LLM APIs have free tiers?", snippet: "OpenAI, Anthropic, Google, Groq..." },
          { question: "How to get free API credits for AI models?", snippet: "Sign up for developer programs..." },
        ],
        relatedSearches: [
          { query: "free LLM API 2026" },
          { query: "AI model free tier comparison" },
          { query: "GPT-4 free API access" },
        ],
        metadata: {
          searchId: "synthetic_light_free_003",
          status: "Success",
          engine: "google_light",
          query: '("free inference" OR "free API credits") (LLM OR "AI model")',
        },
      },
      raw: {
        search_metadata: { id: "synthetic_light_free_003", status: "Success" },
        organic_results: [
          {
            position: 1,
            title: "Free LLM API Credits Comparison 2026",
            link: "https://llmprice.com/free-credits",
            snippet: "Compare free API credits from OpenAI, Anthropic, Google, Mistral and more.",
          },
          {
            position: 2,
            title: "Groq Free Inference Tier — 10K Tokens/Day",
            link: "https://groq.com/free-tier",
            snippet: "Groq offers free inference with 10K tokens per day on Llama 3 models.",
          },
        ],
        related_questions: [
          { question: "Which LLM APIs have free tiers?", snippet: "OpenAI, Anthropic, Google, Groq..." },
          { question: "How to get free API credits for AI models?", snippet: "Sign up for developer programs..." },
        ],
        related_searches: [
          { query: "free LLM API 2026" },
          { query: "AI model free tier comparison" },
          { query: "GPT-4 free API access" },
        ],
      },
    },
  },

  "weekly-deep-unknowns": {
    request: {
      engine: "search_index",
      q: "AI model API pricing free tier credits coding agent subscription",
      params: { mode: "deep" },
    },
    response: {
      request: {
        engine: "search_index",
        q: "AI model API pricing free tier credits coding agent subscription",
        params: { mode: "deep" },
      },
      searchId: "synthetic_index_deep_004",
      fromCache: false,
      cacheSource: "replay",
      hits: [
        {
          position: 1,
          title: "Together AI Pricing — Open Source Models",
          url: "https://together.ai/pricing",
          snippet: "Together AI offers competitive pricing for open source Llama, Mistral, and Qwen models.",
        },
        {
          position: 2,
          title: "Fireworks AI Free Tier — 1M Tokens Monthly",
          url: "https://fireworks.ai/pricing",
          snippet: "Fireworks AI provides 1M free tokens monthly for their serverless inference API.",
        },
        {
          position: 3,
          title: "DeepSeek API Pricing — Cheapest Chinese LLM",
          url: "https://platform.deepseek.com/api-docs/pricing",
          snippet: "DeepSeek API pricing at $0.14 per million tokens for their latest model.",
        },
      ],
      raw: {
        search_metadata: { id: "synthetic_index_deep_004", status: "Success" },
        organic_results: [
          {
            position: 1,
            title: "Together AI Pricing — Open Source Models",
            link: "https://together.ai/pricing",
            snippet: "Together AI offers competitive pricing for open source Llama, Mistral, and Qwen models.",
          },
          {
            position: 2,
            title: "Fireworks AI Free Tier — 1M Tokens Monthly",
            link: "https://fireworks.ai/pricing",
            snippet: "Fireworks AI provides 1M free tokens monthly for their serverless inference API.",
          },
          {
            position: 3,
            title: "DeepSeek API Pricing — Cheapest Chinese LLM",
            link: "https://platform.deepseek.com/api-docs/pricing",
            snippet: "DeepSeek API pricing at $0.14 per million tokens for their latest model.",
          },
        ],
      },
    },
  },
};
