/**
 * SPEC: Official domain allowlist for provider verification.
 * Only domains in this list are considered authoritative sources.
 */

export const OFFICIAL_DOMAINS: Record<string, string[]> = {
  OpenAI: ["openai.com", "platform.openai.com"],
  Anthropic: ["anthropic.com", "console.anthropic.com"],
  Google: ["ai.google.dev", "cloud.google.com"],
  DeepSeek: ["deepseek.com", "platform.deepseek.com", "api-docs.deepseek.com"],
  Groq: ["groq.com", "console.groq.com"],
  Mistral: ["mistral.ai", "console.mistral.ai"],
  Cursor: ["cursor.sh"],
  GitHub: ["github.com", "github.blog"],
  Zai: ["z.ai", "docs.z.ai"],
  OpenRouter: ["openrouter.ai"],
  Together: ["together.ai"],
  Fireworks: ["fireworks.ai"],
  Cohere: ["cohere.com"],
  HuggingFace: ["huggingface.co"],
};

/**
 * Check if a URL belongs to an official provider domain.
 */
export function isOfficialUrl(url: string, providerHint?: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Check against allowlist
    for (const [provider, domains] of Object.entries(OFFICIAL_DOMAINS)) {
      // If providerHint is given, only check that provider
      if (providerHint && provider.toLowerCase() !== providerHint.toLowerCase()) {
        continue;
      }

      for (const domain of domains) {
        if (host === domain || host.endsWith("." + domain)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Find official URL from search results.
 */
export function findOfficialUrl(
  hits: Array<{ url: string }>,
  providerHint?: string
): string | undefined {
  for (const hit of hits) {
    if (isOfficialUrl(hit.url, providerHint)) {
      return hit.url;
    }
  }
  return undefined;
}
