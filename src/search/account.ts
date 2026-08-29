export type SerpApiAccount = {
  total_searches_left?: number;
  plan_searches_left?: number;
  searches_per_month?: number;
  this_month_usage?: number;
  this_hour_searches?: number;
  account_rate_limit_per_hour?: number;
  plan_renewal_date?: string;
};

export async function getSerpApiAccount(
  apiKey = process.env.SERPAPI_API_KEY
): Promise<SerpApiAccount> {
  if (!apiKey) throw new Error("SERPAPI_API_KEY missing");
  const url = new URL("https://serpapi.com/account.json");
  url.searchParams.set("api_key", apiKey);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi Account HTTP ${res.status}`);
  return res.json();
}

export function allowedPaidBatch(
  searchesLeft: number,
  configuredBudget: number,
  reserve = 20
) {
  if (searchesLeft <= reserve) return 0;
  const available = searchesLeft - reserve;
  if (searchesLeft <= 50) return Math.min(1, configuredBudget, available);
  if (searchesLeft <= 100) return Math.min(2, configuredBudget, available);
  return Math.min(configuredBudget, available);
}
