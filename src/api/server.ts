/**
 * SPEC: LiveLLM HTTP API Server
 *
 * Endpoints:
 * GET  /v1/market           — compact market snapshot
 * GET  /v1/models/:model    — detailed model facts
 * POST /v1/economics/route  — workload-specific route evaluation
 * GET  /v1/changes          — recent market changes
 * GET  /v1/evidence/:id     — provenance bundle
 */

import http from "node:http";
import { materializeState } from "../facts/materialize.js";
import { FactRepo } from "../db/facts.js";
import { calculateEconomics, PROVIDER_WORKLOADS } from "../facts/economics.js";
import { PromotionDetector } from "../pipeline/promotions.js";
import { resolve } from "node:path";

const DB_PATH = resolve(process.cwd(), "data", "livellm.db");

type Route = {
  method: string;
  path: string | RegExp;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => Promise<void>;
};

const routes: Route[] = [
  // GET /v1/market — compact market snapshot
  {
    method: "GET",
    path: /^\/v1\/market$/,
    handler: async (req, res) => {
      const state = await materializeState(DB_PATH);
      const detector = new PromotionDetector();
      const promos = await detector.getActivePromotions();

      const models = state.models.map((m: any) => ({
        model: m.name,
        provider: m.provider,
        input: m.pricing.input_per_1m,
        output: m.pricing.output_per_1m,
        cached: m.pricing.cached_input_per_1m,
        monthly: m.pricing.monthly,
        promotion: promos.find((p: any) => p.entity.includes(m.name)),
      }));

      sendJson(res, {
        generated_at: state.generated_at,
        models,
        stats: state.stats,
      });
    },
  },

  // GET /v1/models/:model — detailed model facts
  {
    method: "GET",
    path: /^\/v1\/models\/(.+)$/,
    handler: async (req, res, params) => {
      const modelId = decodeURIComponent(params[1]);
      const factRepo = new FactRepo();
      const entities = await factRepo.getEntities();
      const matching = entities.filter((e: string) =>
        e.toLowerCase().includes(modelId.toLowerCase())
      );

      if (matching.length === 0) {
        sendJson(res, { error: "Model not found" }, 404);
        return;
      }

      const results = [];
      for (const entity of matching) {
        const facts = await factRepo.getEntityFacts(entity);
        results.push({
          entity,
          facts: facts.map((f: any) => ({
            field: f.field,
            value: f.value,
            unit: f.unit,
            confidence: f.confidence,
          })),
        });
      }

      sendJson(res, { models: results });
    },
  },

  // POST /v1/economics/route — workload-specific route evaluation
  {
    method: "POST",
    path: /^\/v1\/economics\/route$/,
    handler: async (req, res) => {
      const body = await readBody(req);
      const { model, workload, routes } = JSON.parse(body);

      if (!model || !workload) {
        sendJson(res, { error: "model and workload required" }, 400);
        return;
      }

      const factRepo = new FactRepo();
      const entities = await factRepo.getEntities();
      const matching = entities.filter((e: string) =>
        e.toLowerCase().includes(model.toLowerCase())
      );

      const evaluations = [];
      for (const entity of matching) {
        const facts = await factRepo.getEntityFacts(entity);
        const input = facts.find((f: any) => f.field === "input_price_usd_per_million");
        const output = facts.find((f: any) => f.field === "output_price_usd_per_million");
        const cached = facts.find((f: any) => f.field === "cached_input_price_usd_per_million");
        const subscription = facts.find((f: any) => f.field === "subscription_price_usd_month");
        const usageValue = facts.find((f: any) => f.field === "usage_value_usd_month");
        const requests = facts.find((f: any) => f.field === "request_limit_month");
        const promoMult = facts.find((f: any) => f.field === "promotion_multiplier");
        const promoEnd = facts.find((f: any) => f.field === "promotion_end_at");

        if (input) {
          const plan = subscription
            ? {
                kind: "subscription" as const,
                monthlyPrice: subscription.value,
                inputPerMillion: input.value,
                outputPerMillion: output?.value ?? 0,
                cachedInputPerMillion: cached?.value,
                usageValueUsd: usageValue?.value,
                requestsPerMonth: requests?.value,
                promotionMultiplier: promoMult?.value,
                promotionEndAt: promoEnd?.value,
              }
            : {
                kind: "payg" as const,
                inputPerMillion: input.value,
                outputPerMillion: output?.value ?? 0,
                cachedInputPerMillion: cached?.value,
              };

          const result = calculateEconomics(
            entity,
            entity.split(":")[0],
            entity.split(":").slice(1).join(":"),
            plan,
            workload
          );

          evaluations.push({ entity, result });
        }
      }

      // Find cheapest
      const computable = evaluations.filter((e: any) => e.result.status === "computed");
      const cheapest = computable.sort((a: any, b: any) => {
        const costA = a.result.status === "computed" ? a.result.simulatedMonthlyUsd : Infinity;
        const costB = b.result.status === "computed" ? b.result.simulatedMonthlyUsd : Infinity;
        return costA - costB;
      })[0];

      sendJson(res, {
        model,
        workload,
        recommendation: cheapest
          ? {
              route: cheapest.entity,
              estimated_cost_usd: cheapest.result.status === "computed" ? cheapest.result.simulatedMonthlyUsd : null,
              multiple: cheapest.result.status === "computed" ? cheapest.result.effectiveMultiple : null,
            }
          : null,
        alternatives: computable.map((e: any) => ({
          route: e.entity,
          cost: e.result.status === "computed" ? e.result.simulatedMonthlyUsd : null,
          multiple: e.result.status === "computed" ? e.result.effectiveMultiple : null,
        })),
        uncomputable: evaluations
          .filter((e: any) => e.result.status === "not_computable")
          .map((e: any) => ({ route: e.entity, missing: e.result.missing })),
      });
    },
  },

  // GET /v1/changes — recent market changes
  {
    method: "GET",
    path: /^\/v1\/changes$/,
    handler: async (req, res) => {
      const factRepo = new FactRepo();
      const changes = await factRepo.getRecentChanges(20);
      sendJson(res, { changes });
    },
  },

  // GET /v1/health — health check
  {
    method: "GET",
    path: /^\/v1\/health$/,
    handler: async (req, res) => {
      sendJson(res, { status: "ok", version: "0.1.0" });
    },
  },
];

function sendJson(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export function createServer(port = 3847): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    for (const route of routes) {
      if (req.method !== route.method) continue;
      const match = url.pathname.match(route.path);
      if (match) {
        try {
          const params: Record<string, string> = {};
          match.forEach((val, idx) => { params[idx.toString()] = val; });
          await route.handler(req, res, params);
        } catch (err: any) {
          sendJson(res, { error: err.message }, 500);
        }
        return;
      }
    }

    sendJson(res, { error: "Not found" }, 404);
  });

  server.listen(port, () => {
    console.log(`LiveLLM API running on http://localhost:${port}`);
    console.log("Endpoints:");
    console.log("  GET  /v1/market");
    console.log("  GET  /v1/models/:model");
    console.log("  POST /v1/economics/route");
    console.log("  GET  /v1/changes");
    console.log("  GET  /v1/health");
  });

  return server;
}
