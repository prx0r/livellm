/**
 * SPEC: LLM Economics Engine
 *
 * Calculates value metrics for LLM subscriptions.
 * NO FALLBACKS — if data is missing, return not_computable.
 */

export type Workload = {
  uncachedInputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

export type PricingPlan =
  | {
      kind: "payg";
      inputPerMillion: number;
      outputPerMillion: number;
      cachedInputPerMillion?: number;
    }
  | {
      kind: "subscription";
      monthlyPrice: number;
      inputPerMillion: number;
      outputPerMillion: number;
      cachedInputPerMillion?: number;
      usageValueUsd?: number;
      requestsPerMonth?: number;
      requestLimit5h?: number;
      requestLimitWeek?: number;
      requestLimitMonth?: number;
      promotionMultiplier?: number;
      promotionDiscountPct?: number;
      promotionEndAt?: string;
    };

export type EconomicsResult =
  | {
      status: "computed";
      modelId: string;
      provider: string;
      name: string;
      plan: PricingPlan;
      workload: Workload;
      costPerRequest: number;
      simulatedMonthlyUsd: number;
      effectiveMultiple?: number; // only for subscriptions
      reconciliationResidual?: number;
      reconciliationStatus?: "consistent" | "warning" | "major_disagreement";
      notes: string[];
    }
  | {
      status: "not_computable";
      missing: string[];
    };

// Standard workloads
export const WORKLOADS = {
  providerObserved: (input: number, cached: number, output: number): Workload => ({
    uncachedInputTokens: input,
    cachedInputTokens: cached,
    outputTokens: output,
  }),
  codingAgentHighCache: {
    uncachedInputTokens: 830,
    cachedInputTokens: 71_500,
    outputTokens: 295,
  },
  chat: {
    uncachedInputTokens: 2_000,
    cachedInputTokens: 0,
    outputTokens: 500,
  },
  research: {
    uncachedInputTokens: 5_000,
    cachedInputTokens: 0,
    outputTokens: 1_000,
  },
} as const;

// Known provider workloads from OpenCode docs
export const PROVIDER_WORKLOADS: Record<string, Workload> = {
  "OpenCode:MiMo V2.5": { uncachedInputTokens: 830, cachedInputTokens: 71_500, outputTokens: 295 },
  "OpenCode:Hy3": { uncachedInputTokens: 830, cachedInputTokens: 71_500, outputTokens: 295 },
  "OpenCode:GLM-5.3-Flash": { uncachedInputTokens: 1_000, cachedInputTokens: 55_000, outputTokens: 200 },
  "OpenCode:GLM-5.3": { uncachedInputTokens: 700, cachedInputTokens: 52_000, outputTokens: 150 },
  "OpenCode:GPT 5.6 Luna": { uncachedInputTokens: 1_000, cachedInputTokens: 50_000, outputTokens: 220 },
  "OpenCode:Kimi K2.7": { uncachedInputTokens: 870, cachedInputTokens: 55_000, outputTokens: 200 },
  "OpenCode:DeepSeek V4 Flash": { uncachedInputTokens: 410, cachedInputTokens: 71_300, outputTokens: 310 },
  "OpenCode:Muse Spark 1.2": { uncachedInputTokens: 620, cachedInputTokens: 71_400, outputTokens: 300 },
};

/**
 * SPEC: Calculate economics for a model.
 * Returns not_computable if required data is missing.
 */
export function calculateEconomics(
  modelId: string,
  provider: string,
  name: string,
  plan: PricingPlan,
  workload: Workload
): EconomicsResult {
  const missing: string[] = [];

  // Check required fields
  if (!plan.inputPerMillion) missing.push("input_price");
  if (!plan.outputPerMillion) missing.push("output_price");
  if (workload.uncachedInputTokens === 0 && workload.cachedInputTokens === 0 && workload.outputTokens === 0) {
    missing.push("workload");
  }

  // For subscription, check additional fields
  if (plan.kind === "subscription") {
    if (!plan.monthlyPrice) missing.push("subscription_price");
    if (!plan.usageValueUsd && !plan.requestsPerMonth) {
      missing.push("usage_value_or_requests");
    }
  }

  if (missing.length > 0) {
    return { status: "not_computable", missing };
  }

  // Calculate cost per request
  const cachedRate = plan.cachedInputPerMillion ?? plan.inputPerMillion * 0.2;
  const costPerRequest =
    (plan.inputPerMillion * workload.uncachedInputTokens +
      cachedRate * workload.cachedInputTokens +
      plan.outputPerMillion * workload.outputTokens) /
    1_000_000;

  const notes: string[] = [];

  if (plan.kind === "payg") {
    return {
      status: "computed",
      modelId,
      provider,
      name,
      plan,
      workload,
      costPerRequest,
      simulatedMonthlyUsd: 0, // PAYG has no monthly concept
      notes: ["PAYG pricing — no subscription multiple"],
    };
  }

  // Subscription economics
  const baselineRequests = plan.requestsPerMonth;
  if (baselineRequests == null) {
    return {
      status: "not_computable",
      missing: ["requests_per_month"],
    };
  }

  // Apply promotion multiplier if present
  let effectiveRequests = baselineRequests;
  if (plan.promotionMultiplier && plan.promotionMultiplier > 1) {
    effectiveRequests = baselineRequests * plan.promotionMultiplier;
    notes.push(`${plan.promotionMultiplier}× usage promotion: ${baselineRequests} → ${effectiveRequests} requests/month`);
  }

  // Simulate with effective requests (post-promo)
  const simulatedMonthly = costPerRequest * effectiveRequests;

  // Multiple = how much value you get vs what you pay
  const effectiveMultiple = simulatedMonthly / plan.monthlyPrice;

  // Reconciliation (compare baseline simulation to provider's usage value)
  let reconciliationResidual: number | undefined;
  let reconciliationStatus: "consistent" | "warning" | "major_disagreement" | undefined;

  if (plan.usageValueUsd) {
    const baselineSimulated = costPerRequest * baselineRequests;
    reconciliationResidual =
      ((baselineSimulated - plan.usageValueUsd) / plan.usageValueUsd) * 100;

    if (Math.abs(reconciliationResidual) < 10) {
      reconciliationStatus = "consistent";
    } else if (Math.abs(reconciliationResidual) < 25) {
      reconciliationStatus = "warning";
    } else {
      reconciliationStatus = "major_disagreement";
      notes.push(`Baseline simulation $${baselineSimulated.toFixed(2)} vs provider $${plan.usageValueUsd} (${reconciliationResidual.toFixed(1)}% residual)`);
    }
  }

  if (plan.promotionEndAt) {
    const endDate = new Date(plan.promotionEndAt);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      notes.push(`Promotion ends in ${daysLeft} days`);
    } else {
      notes.push("Promotion expired");
    }
  }

  return {
    status: "computed",
    modelId,
    provider,
    name,
    plan,
    workload,
    costPerRequest,
    simulatedMonthlyUsd: simulatedMonthly,
    effectiveMultiple,
    reconciliationResidual,
    reconciliationStatus,
    notes,
  };
}

/**
 * SPEC: Format economics for display.
 */
export function formatEconomics(result: EconomicsResult): string {
  if (result.status === "not_computable") {
    return `Not computable: missing ${result.missing.join(", ")}`;
  }

  const lines: string[] = [];

  lines.push(`## ${result.provider} / ${result.name}`);
  lines.push("");

  if (result.plan.kind === "subscription") {
    lines.push("### Subscription");
    lines.push(`- Price: $${result.plan.monthlyPrice}/mo`);
    if (result.plan.usageValueUsd) lines.push(`- Usage value: $${result.plan.usageValueUsd}`);
    if (result.plan.promotionMultiplier) lines.push(`- Promotion: ${result.plan.promotionMultiplier}× usage`);
    if (result.plan.promotionEndAt) lines.push(`- Expires: ${result.plan.promotionEndAt}`);
  } else {
    lines.push("### PAYG Pricing");
  }

  lines.push("");
  lines.push("### Pricing");
  lines.push(`- Input: $${result.plan.inputPerMillion}/1M tokens`);
  lines.push(`- Output: $${result.plan.outputPerMillion}/1M tokens`);
  if (result.plan.cachedInputPerMillion) {
    lines.push(`- Cached: $${result.plan.cachedInputPerMillion}/1M tokens`);
  }

  lines.push("");
  lines.push("### Workload");
  lines.push(`- Input: ${result.workload.uncachedInputTokens} tokens`);
  lines.push(`- Cached: ${result.workload.cachedInputTokens} tokens`);
  lines.push(`- Output: ${result.workload.outputTokens} tokens`);
  lines.push(`- Cost/request: $${result.costPerRequest.toFixed(6)}`);

  if (result.plan.kind === "subscription") {
    lines.push("");
    lines.push("### Value");
    lines.push(`- Monthly equivalent: $${result.simulatedMonthlyUsd.toFixed(2)}`);
    if (result.effectiveMultiple !== undefined) {
      lines.push(`- **Effective multiple: ${result.effectiveMultiple.toFixed(2)}×**`);
    }

    if (result.reconciliationResidual !== undefined) {
      const icon =
        result.reconciliationStatus === "consistent" ? "✓" :
        result.reconciliationStatus === "warning" ? "⚠" : "✗";
      lines.push(`- Reconciliation: ${icon} ${result.reconciliationResidual > 0 ? "+" : ""}${result.reconciliationResidual.toFixed(1)}%`);
    }
  }

  if (result.notes.length > 0) {
    lines.push("");
    for (const note of result.notes) {
      lines.push(`> ${note}`);
    }
  }

  return lines.join("\n");
}
