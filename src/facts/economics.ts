/**
 * SPEC: LLM Economics Engine
 *
 * Calculates value metrics for LLM subscriptions:
 * - cost_per_request: simulated PAYG cost
 * - effective_multiple: how much subscription is worth vs PAYG
 * - provider_reconciliation: compare simulation to provider claims
 *
 * Based on the LLMDeals workload simulation:
 * - 830 uncached input tokens
 * - 71,500 cached-read tokens
 * - 295 output tokens
 */

export type ModelPricing = {
  input_per_1m: number;
  output_per_1m: number;
  cached_input_per_1m?: number;
  monthly_price: number;
  provider_usage_usd?: number; // What the provider says is included
  requests_per_month?: number;
  provider_requests?: number; // What the provider says is included
};

export type EconomicsResult = {
  model_id: string;
  provider: string;
  name: string;

  // Pricing
  input_per_1m: number;
  output_per_1m: number;
  cached_input_per_1m: number;
  monthly_price: number;

  // Workload
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;

  // Calculations
  cost_per_request: number;
  simulated_monthly_usd: number;
  effective_multiple: number;

  // Reconciliation
  provider_usage_usd?: number;
  provider_requests?: number;
  provider_multiple?: number;
  reconciliation_residual?: number;
  reconciliation_status?: "consistent" | "warning" | "major_disagreement";

  // Metadata
  confidence: "high" | "medium" | "low";
  notes: string[];
};

// The standard LLMDeals workload simulation
const WORKLOAD = {
  input_tokens: 830,
  cached_tokens: 71_500,
  output_tokens: 295,
};

/**
 * SPEC: Calculate economics for a model.
 */
export function calculateEconomics(
  modelId: string,
  provider: string,
  name: string,
  pricing: ModelPricing
): EconomicsResult {
  const cachedRate = pricing.cached_input_per_1m ?? pricing.input_per_1m * 0.2;

  // Cost per request
  const costPerRequest =
    (pricing.input_per_1m * WORKLOAD.input_tokens +
      cachedRate * WORKLOAD.cached_tokens +
      pricing.output_per_1m * WORKLOAD.output_tokens) /
    1_000_000;

  // Monthly simulation
  const requestsPerMonth = pricing.requests_per_month ?? 30_000;
  const simulatedMonthly = costPerRequest * requestsPerMonth;

  // Effective multiple
  const effectiveMultiple = simulatedMonthly / pricing.monthly_price;

  // Reconciliation
  let reconciliationResidual: number | undefined;
  let reconciliationStatus: EconomicsResult["reconciliation_status"];
  const notes: string[] = [];

  if (pricing.provider_usage_usd) {
    reconciliationResidual =
      ((simulatedMonthly - pricing.provider_usage_usd) /
        pricing.provider_usage_usd) *
      100;

    if (Math.abs(reconciliationResidual) < 10) {
      reconciliationStatus = "consistent";
    } else if (Math.abs(reconciliationResidual) < 25) {
      reconciliationStatus = "warning";
      notes.push(
        `Workload simulation differs ${reconciliationResidual.toFixed(1)}% from provider claim`
      );
    } else {
      reconciliationStatus = "major_disagreement";
      notes.push(
        `MAJOR: Simulation $${simulatedMonthly.toFixed(2)} vs provider $${pricing.provider_usage_usd} (${reconciliationResidual.toFixed(1)}% residual)`
      );
    }
  }

  const confidence =
    pricing.provider_usage_usd && pricing.requests_per_month
      ? "high"
      : pricing.input_per_1m > 0
      ? "medium"
      : "low";

  return {
    model_id: modelId,
    provider,
    name,
    input_per_1m: pricing.input_per_1m,
    output_per_1m: pricing.output_per_1m,
    cached_input_per_1m: cachedRate,
    monthly_price: pricing.monthly_price,
    input_tokens: WORKLOAD.input_tokens,
    cached_tokens: WORKLOAD.cached_tokens,
    output_tokens: WORKLOAD.output_tokens,
    cost_per_request: costPerRequest,
    simulated_monthly_usd: simulatedMonthly,
    effective_multiple: effectiveMultiple,
    provider_usage_usd: pricing.provider_usage_usd,
    provider_requests: pricing.requests_per_month,
    provider_multiple: pricing.provider_usage_usd
      ? pricing.provider_usage_usd / pricing.monthly_price
      : undefined,
    reconciliation_residual: reconciliationResidual,
    reconciliation_status: reconciliationStatus,
    confidence,
    notes,
  };
}

/**
 * SPEC: Format economics for display.
 */
export function formatEconomics(result: EconomicsResult): string {
  const lines: string[] = [];

  lines.push(`## ${result.provider} / ${result.name}`);
  lines.push("");

  lines.push("### Pricing");
  lines.push(`- Input: $${result.input_per_1m}/1M tokens`);
  lines.push(`- Output: $${result.output_per_1m}/1M tokens`);
  lines.push(`- Cached: $${result.cached_input_per_1m}/1M tokens`);
  lines.push(`- Subscription: $${result.monthly_price}/mo`);
  lines.push("");

  lines.push("### Workload Simulation");
  lines.push(`- Input: ${result.input_tokens} tokens`);
  lines.push(`- Cached: ${result.cached_tokens} tokens`);
  lines.push(`- Output: ${result.output_tokens} tokens`);
  lines.push(`- Cost/request: $${result.cost_per_request.toFixed(6)}`);
  lines.push(`- Monthly equivalent: $${result.simulated_monthly_usd.toFixed(2)}`);
  lines.push("");

  lines.push("### Value");
  lines.push(`- **Effective multiple: ${result.effective_multiple.toFixed(2)}×**`);

  if (result.provider_usage_usd) {
    lines.push(`- Provider stated usage: $${result.provider_usage_usd}`);
  }

  if (result.reconciliation_residual !== undefined) {
    const icon =
      result.reconciliation_status === "consistent"
        ? "✓"
        : result.reconciliation_status === "warning"
        ? "⚠"
        : "✗";
    lines.push(
      `- Reconciliation: ${icon} ${result.reconciliation_residual > 0 ? "+" : ""}${result.reconciliation_residual.toFixed(1)}%`
    );
  }

  if (result.notes.length > 0) {
    lines.push("");
    for (const note of result.notes) {
      lines.push(`> ${note}`);
    }
  }

  return lines.join("\n");
}
