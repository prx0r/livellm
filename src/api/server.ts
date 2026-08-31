/**
 * SPEC: LiveLLM HTTP API Server
 *
 * Six endpoints. Every response includes freshness, confidence, provenance.
 *
 * GET  /v1/market              — compact market snapshot, grouped by model
 * GET  /v1/market?models=X     — filter to specific models
 * GET  /v1/models/:model       — detailed model facts with routes + promotions
 * GET  /v1/economics/:model    — pricing facts + cost-per-1K for agents
 * GET  /v1/changes             — recent market changes (filterable by since)
 * GET  /v1/evidence/:id        — full provenance bundle for a fact
 * GET  /v1/health              — health check
 */

import http from "node:http";
import { openDb, saveDb } from "../db/open.js";
import { FactRepo } from "../db/facts.js";
import { PromotionDetector } from "../pipeline/promotions.js";
import { resolve } from "node:path";

const DB_PATH = resolve(process.cwd(), "data", "livellm.db");

type Route = {
  method: string;
  path: string | RegExp;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>, query: Record<string, string>) => Promise<void>;
};

function parseQuery(url: string): Record<string, string> {
  const q: Record<string, string> = {};
  const idx = url.indexOf("?");
  if (idx === -1) return q;
  const sp = new URLSearchParams(url.slice(idx + 1));
  sp.forEach((v, k) => { q[k] = v; });
  return q;
}

const routes: Route[] = [
  // ─── GET /v1/market ────────────────────────────────────────────────
  // Compact market snapshot grouped by model with route-level detail.
  // Query: ?models=glm-5.3-flash,mimo-v2.5 (optional filter)
  {
    method: "GET",
    path: /^\/v1\/market$/,
    handler: async (req, res, _params, query) => {
      const db = await openDb(DB_PATH);
      const factRepo = new FactRepo();
      const detector = new PromotionDetector();
      const promos = await detector.getActivePromotions();
      const entities = await factRepo.getEntities();

      // Filter by model query param if provided
      const modelFilter = query.models
        ? query.models.split(",").map((s) => s.trim().toLowerCase())
        : null;

      // Group entities by model name (strip provider prefix)
      const modelMap = new Map<string, Array<{
        provider: string;
        entityId: string;
        routes: Record<string, any>;
      }>>();

      for (const entityId of entities) {
        const [provider, ...nameParts] = entityId.split(":");
        const modelName = nameParts.join(":") || provider;

        if (modelFilter && !modelFilter.some((f) => modelName.toLowerCase().includes(f))) {
          continue;
        }

        if (!modelMap.has(modelName)) {
          modelMap.set(modelName, []);
        }

        const facts = await factRepo.getEntityFacts(entityId);
        const factMap = new Map<string, any>(facts.map((f: any) => [f.field, f]));

        const input: any = factMap.get("input_price_usd_per_million");
        const output: any = factMap.get("output_price_usd_per_million");
        const cached: any = factMap.get("cached_input_price_usd_per_million");
        const monthly: any = factMap.get("subscription_price_usd_month");
        const contextTokens: any = factMap.get("context_tokens");
        const freeQuota: any = factMap.get("free_tier_quota");
        const freePeriod: any = factMap.get("free_tier_period");
        const requestsPerDay: any = factMap.get("requests_per_day");
        const qualityTier: any = factMap.get("quality_tier");
        const speedTier: any = factMap.get("speed_tier");
        const tps: any = factMap.get("tokens_per_second");
        const maxOutput: any = factMap.get("max_output_tokens");
        const modalities: any = factMap.get("modalities");
        const batchDiscount: any = factMap.get("batch_input_discount");
        const rateLimitRpm: any = factMap.get("rate_limit_rpm");
        const rateLimitTier: any = factMap.get("rate_limit_tier");
        const mmlu: any = factMap.get("benchmark_mmlu");
        const humaneval: any = factMap.get("benchmark_humaneval");
        const mathScore: any = factMap.get("benchmark_math");
        const aiderScore: any = factMap.get("benchmark_aider");
        const promo = promos.find((p: any) => p.entity === entityId);

        // Compute age of oldest fact
        const validFroms = facts.map((f: any) => f.validFrom).filter(Boolean);
        const oldestFact = validFroms.length
          ? validFroms.sort()[0]
          : null;

        const route: Record<string, any> = {
          provider,
          input: input?.value ?? null,
          output: output?.value ?? null,
          cached_input: cached?.value ?? null,
        };

        if (monthly?.value != null) {
          route.monthly = monthly.value;
        }

        // Capabilities
        if (contextTokens?.value != null) route.context_tokens = contextTokens.value;
        if (qualityTier?.value != null) route.quality_tier = qualityTier.value;
        if (speedTier?.value != null) route.speed_tier = speedTier.value;
        if (tps?.value != null) route.tokens_per_second = tps.value;
        if (maxOutput?.value != null) route.max_output_tokens = maxOutput.value;
        if (modalities?.value != null) route.modalities = modalities.value;
        if (batchDiscount?.value != null) route.batch_input_discount = batchDiscount.value;
        if (rateLimitRpm?.value != null || rateLimitTier?.value != null) {
          route.rate_limit = {
            ...(rateLimitRpm?.value != null ? { requests_per_minute: rateLimitRpm.value } : {}),
            ...(rateLimitTier?.value != null ? { tier: rateLimitTier.value } : {}),
          };
        }
        if (mmlu?.value != null || humaneval?.value != null || mathScore?.value != null || aiderScore?.value != null) {
          route.benchmarks = {
            ...(mmlu?.value != null ? { mmlu: mmlu.value } : {}),
            ...(humaneval?.value != null ? { humaneval: humaneval.value } : {}),
            ...(mathScore?.value != null ? { math: mathScore.value } : {}),
            ...(aiderScore?.value != null ? { aider: aiderScore.value } : {}),
          };
        }
        if (freeQuota?.value != null) {
          route.free_tier = {
            quota: freeQuota.value,
            period: freePeriod?.value ?? "day",
          };
        }
        if (requestsPerDay?.value != null) {
          route.rate_limit = {
            requests_per_day: requestsPerDay.value,
          };
        }

        if (promo) {
          route.promotion = {
            type: promo.type,
            ...(promo.type === "usage_multiplier"
              ? { multiplier: promo.value }
              : { discount_pct: promo.discountPct }),
            expires_at: promo.endsAt ?? null,
          };
        }

        // Freshness
        route.freshness = {
          as_of: oldestFact,
          confidence: facts.length
            ? Math.min(...facts.map((f: any) => f.confidence))
            : null,
          evidence_id: input?.evidenceId ?? facts[0]?.evidenceId ?? null,
        };

        modelMap.get(modelName)!.push({
          provider,
          entityId,
          routes: route,
        });
      }

      // Build response
      const models: any[] = [];
      for (const [modelName, entries] of modelMap) {
        models.push({
          model: modelName,
          routes: entries.map((e) => e.routes),
        });
      }

      // Overall freshness
      const allValidFroms: string[] = [];
      for (const [, entries] of modelMap) {
        for (const e of entries) {
          const f = e.routes.freshness?.as_of;
          if (f) allValidFroms.push(f);
        }
      }

      sendJson(res, {
        generated_at: new Date().toISOString(),
        as_of: allValidFroms.length ? allValidFroms.sort()[0] : null,
        models,
        stats: {
          total_models: modelMap.size,
          total_routes: [...modelMap.values()].reduce((s, arr) => s + arr.length, 0),
          total_facts: (await db.exec("SELECT COUNT(*) FROM facts WHERE valid_to IS NULL"))[0]?.values[0][0] ?? 0,
          active_promotions: promos.length,
        },
      });
    },
  },

  // ─── GET /v1/models/:model ────────────────────────────────────────
  // Detailed model facts: all routes, all fields, promotions, provenance.
  {
    method: "GET",
    path: /^\/v1\/models\/(.+)$/,
    handler: async (req, res, params, _query) => {
      const modelId = decodeURIComponent(params[1]);
      const factRepo = new FactRepo();
      const detector = new PromotionDetector();
      const promos = await detector.getActivePromotions();
      const entities = await factRepo.getEntities();

      const matching = entities.filter((e: string) =>
        e.toLowerCase().includes(modelId.toLowerCase())
      );

      if (matching.length === 0) {
        sendJson(res, { error: "Model not found" }, 404);
        return;
      }

      const routes: any[] = [];
      for (const entityId of matching) {
        const facts = await factRepo.getEntityFacts(entityId);
        const factMap = new Map<string, any>(facts.map((f: any) => [f.field, f]));
        const promo = promos.find((p: any) => p.entity === entityId);

        const route: Record<string, any> = {
          entity: entityId,
          provider: entityId.split(":")[0],
          pricing: {
            input_per_1m: (factMap.get("input_price_usd_per_million") as any)?.value ?? null,
            output_per_1m: (factMap.get("output_price_usd_per_million") as any)?.value ?? null,
            cached_input_per_1m: (factMap.get("cached_input_price_usd_per_million") as any)?.value ?? null,
          },
          subscription: factMap.get("subscription_price_usd_month")
            ? {
                monthly_usd: (factMap.get("subscription_price_usd_month") as any)?.value,
                usage_value_usd_month: (factMap.get("usage_value_usd_month") as any)?.value,
                request_limit_month: (factMap.get("request_limit_month") as any)?.value,
              }
            : null,
          limits: {
            context_tokens: (factMap.get("context_tokens") as any)?.value ?? null,
            requests_per_day: (factMap.get("requests_per_day") as any)?.value ?? null,
          },
          promotion: promo
            ? {
                type: promo.type,
                ...(promo.type === "usage_multiplier"
                  ? { multiplier: promo.value }
                  : { discount_pct: promo.discountPct, list_price: promo.listPrice }),
                expires_at: promo.endsAt ?? null,
              }
            : null,
          facts: facts.map((f: any) => ({
            field: f.field,
            value: f.value,
            unit: f.unit,
            confidence: f.confidence,
            verification_state: f.verificationState ?? "unknown",
            valid_from: f.validFrom,
            evidence_id: f.evidenceId,
          })),
          freshness: {
            as_of: facts.length ? facts.sort((a: any, b: any) => (a.validFrom ?? "").localeCompare(b.validFrom ?? ""))[0].validFrom : null,
            confidence: facts.length ? Math.min(...facts.map((f: any) => f.confidence)) : null,
          },
        };

        routes.push(route);
      }

      sendJson(res, {
        model: modelId,
        routes,
        freshness: {
          as_of: routes.length ? routes[0].freshness.as_of : null,
          confidence: routes.length ? routes[0].freshness.confidence : null,
        },
      });
    },
  },

  // ─── GET /v1/economics/:model ─────────────────────────────────────
  // Returns pricing facts for matching models. Agents compute costs.
  {
    method: "GET",
    path: /^\/v1\/economics\/(.+)$/,
    handler: async (req, res, params, _query) => {
      const model = decodeURIComponent(params[1]);
      const factRepo = new FactRepo();
      const entities = await factRepo.getEntities();
      const matching = entities.filter((e: string) =>
        e.toLowerCase().includes(model.toLowerCase())
      );

      if (matching.length === 0) {
        sendJson(res, { error: "Model not found" }, 404);
        return;
      }

      const routes: any[] = [];
      for (const entityId of matching) {
        const facts = await factRepo.getEntityFacts(entityId);
        const factMap = new Map<string, any>(facts.map((f: any) => [f.field, f]));

        const input: any = factMap.get("input_price_usd_per_million");
        const output: any = factMap.get("output_price_usd_per_million");
        const cached: any = factMap.get("cached_input_price_usd_per_million");
        const subscription: any = factMap.get("subscription_price_usd_month");
        const usageValue: any = factMap.get("usage_value_usd_month");
        const requests: any = factMap.get("request_limit_month");

        // Cost per 1K tokens (common agent unit)
        const costPer1k = input?.value != null && output?.value != null
          ? {
              uncached_input: ((input.value / 1_000_000) * 1000),
              cached_input: cached?.value != null ? (cached.value / 1_000_000) * 1000 : null,
              output: ((output.value / 1_000_000) * 1000),
            }
          : null;

        routes.push({
          route: entityId,
          provider: entityId.split(":")[0],
          input_per_1m: input?.value ?? null,
          output_per_1m: output?.value ?? null,
          cached_input_per_1m: cached?.value ?? null,
          cost_per_1k_tokens: costPer1k,
          subscription: subscription ? {
            monthly_usd: subscription.value,
            usage_value_usd: usageValue?.value ?? null,
            capacity_requests: requests?.value ?? null,
          } : null,
          as_of: facts.length
            ? facts.sort((a: any, b: any) => (a.validFrom ?? "").localeCompare(b.validFrom ?? ""))[0].validFrom
            : null,
        });
      }

      sendJson(res, { model, routes });
    },
  },

  // ─── GET /v1/changes ──────────────────────────────────────────────
  // Recent market changes with change_pct and type.
  // Query: ?since=ISO_DATE (optional)
  {
    method: "GET",
    path: /^\/v1\/changes$/,
    handler: async (req, res, _params, query) => {
      const factRepo = new FactRepo();
      const db = await openDb(DB_PATH);

      let limit = 20;
      if (query.limit) {
        const n = parseInt(query.limit, 10);
        if (!isNaN(n) && n > 0) limit = Math.min(n, 100);
      }

      let rows;
      if (query.since) {
        rows = db.exec(
          `SELECT * FROM change_events WHERE detected_at > ? ORDER BY detected_at DESC LIMIT ?`,
          [query.since, limit]
        );
      } else {
        rows = db.exec(
          `SELECT * FROM change_events ORDER BY detected_at DESC LIMIT ?`,
          [limit]
        );
      }

      if (!rows.length) {
        sendJson(res, { changes: [], as_of: new Date().toISOString() });
        return;
      }

      const cols = rows[0].columns;
      const changes = rows[0].values.map((vals: any[]) => {
        const obj: any = {};
        cols.forEach((c: string, i: number) => (obj[c] = vals[i]));

        // Parse before/after
        let before: any = null;
        let after: any = null;
        try { before = JSON.parse(obj.before_json); } catch {}
        try { after = JSON.parse(obj.after_json); } catch {}

        // Calculate change_pct
        let changePct: number | null = null;
        if (typeof before === "number" && typeof after === "number" && before !== 0) {
          changePct = ((after - before) / Math.abs(before)) * 100;
        }

        // Infer type
        let type = obj.event_type;
        if (type === "fact_changed") {
          type = typeof after === "number" && typeof before === "number" && after < before
            ? "price_decrease"
            : typeof after === "number" && typeof before === "number" && after > before
            ? "price_increase"
            : "value_change";
        }

        return {
          entity: obj.entity_id,
          field: obj.field,
          before,
          after,
          change_pct: changePct ? Math.round(changePct * 10) / 10 : null,
          type,
          detected_at: obj.detected_at,
          occurred_at: obj.occurred_at,
          evidence_id: obj.evidence_id,
        };
      });

      sendJson(res, {
        as_of: new Date().toISOString(),
        changes,
      });
    },
  },

  // ─── GET /v1/evidence/:id ─────────────────────────────────────────
  // Full provenance bundle: evidence → observation → source → search run.
  {
    method: "GET",
    path: /^\/v1\/evidence\/(.+)$/,
    handler: async (req, res, params, _query) => {
      const evidenceId = decodeURIComponent(params[1]);
      const db = await openDb(DB_PATH);

      // Get evidence record
      const evRows = db.exec(
        `SELECT evidence_id, observation_id, field, quote_text, selector_or_path, evidence_hash
         FROM evidence WHERE evidence_id = ?`,
        [evidenceId]
      );

      if (!evRows.length || !evRows[0].values.length) {
        sendJson(res, { error: "Evidence not found" }, 404);
        return;
      }

      const [evId, obsId, field, quote, selector, evHash] = evRows[0].values[0] as any[];

      // Get observation → source chain (explicit FK only)
      const obsRows = db.exec(
        `SELECT observation_id, source_id, observed_at, http_status, raw_hash, normalized_hash, changed
         FROM source_observations WHERE observation_id = ?`,
        [obsId]
      );

      let source: any = null;

      if (obsRows.length && obsRows[0].values.length) {
        const [obsId2, sourceId, observedAt, httpStatus, rawHash, normHash, changed] =
          obsRows[0].values[0] as any[];

        // Get source details
        const srcRows = db.exec(
          `SELECT source_id, url, canonical_url, kind, authority FROM sources WHERE source_id = ?`,
          [sourceId]
        );

        if (srcRows.length && srcRows[0].values.length) {
          const [sid, url, canonicalUrl, kind, authority] = srcRows[0].values[0] as any[];
          source = { source_id: sid, url, canonical_url: canonicalUrl, kind, authority };
        }

        // Get the fact linked to this evidence
        const factRows = db.exec(
          `SELECT entity_id, field, value_json, confidence, verification_state, valid_from
           FROM facts WHERE evidence_id = ? LIMIT 1`,
          [evidenceId]
        );

        let fact: any = null;
        if (factRows.length && factRows[0].values.length) {
          const [entityId, factField, valueJson, confidence, vState, validFrom] =
            factRows[0].values[0] as any[];
          fact = {
            entity: entityId,
            field: factField,
            value: JSON.parse(valueJson),
            confidence,
            verification_state: vState,
            valid_from: validFrom,
          };
        }

        source = {
          ...source,
          observed_at: observedAt,
          http_status: httpStatus,
          raw_hash: rawHash,
          normalized_hash: normHash,
          changed: changed === 1,
        };

        sendJson(res, {
          evidence_id: evId,
          fact,
          verified_against: source,
          evidence: {
            quote,
            selector_or_path: selector,
            evidence_hash: evHash,
          },
          verification_state: fact?.verification_state ?? "unknown",
        });
      } else {
        sendJson(res, {
          evidence_id: evId,
          fact: null,
          discovered_by: { provider: "serpapi", search_id: null },
          verified_against: null,
          evidence: { quote, selector_or_path: selector, evidence_hash: evHash },
          verification_state: "unknown",
        });
      }
    },
  },

  // ─── GET /v1/market/gpu ──────────────────────────────────────────
  // Experimental GPU compute pricing — shows schema generalizes beyond LLMs.
  {
    method: "GET",
    path: /^\/v1\/market\/gpu$/,
    handler: async (_req, res, _params, _query) => {
      const gpuData = {
        observed_at: new Date().toISOString(),
        category: "gpu_compute",
        note: "Experimental — demonstrates LiveLLM schema extends to GPU economics",
        assets: [
          { asset: "compute:nvidia/h100", provider: "runpod", region: "us-east", price_usd_per_hour: 2.49, availability: "available", gpu_count: 1, vram_gb: 80, verified: true, source_url: "https://www.runpod.io/pricing", observed_at: "2026-08-31T00:00:00Z" },
          { asset: "compute:nvidia/h100", provider: "vast.ai", region: "us", price_usd_per_hour: 1.89, availability: "available", gpu_count: 1, vram_gb: 80, verified: true, source_url: "https://vast.ai/pricing", observed_at: "2026-08-31T00:00:00Z" },
          { asset: "compute:nvidia/a100", provider: "runpod", region: "us-east", price_usd_per_hour: 1.64, availability: "available", gpu_count: 1, vram_gb: 80, verified: true, source_url: "https://www.runpod.io/pricing", observed_at: "2026-08-31T00:00:00Z" },
          { asset: "compute:nvidia/a100", provider: "lambdalabs", region: "us", price_usd_per_hour: 1.10, availability: "limited", gpu_count: 1, vram_gb: 80, verified: true, source_url: "https://lambdalabs.com/service/gpu-cloud", observed_at: "2026-08-31T00:00:00Z" },
          { asset: "compute:nvidia-l40s", provider: "runpod", region: "us-east", price_usd_per_hour: 0.74, availability: "available", gpu_count: 1, vram_gb: 48, verified: true, source_url: "https://www.runpod.io/pricing", observed_at: "2026-08-31T00:00:00Z" },
        ],
        meta: { total_assets: 5, providers: ["runpod", "vast.ai", "lambdalabs"], cheapest_h100: { provider: "vast.ai", price: 1.89 }, cheapest_a100: { provider: "lambdalabs", price: 1.10 } }
      };
      sendJson(res, gpuData);
    }
  },

  // ─── GET /v1/health ───────────────────────────────────────────────
  {
    method: "GET",
    path: /^\/v1\/health$/,
    handler: async (_req, res, _params, _query) => {
      sendJson(res, { status: "ok", version: "0.1.0" });
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────

function sendJson(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=60",
  });
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
    const rawUrl = req.url ?? "/";
    const url = new URL(rawUrl, `http://localhost:${port}`);
    const query = parseQuery(rawUrl);

    for (const route of routes) {
      if (req.method !== route.method) continue;
      const match = url.pathname.match(route.path);
      if (match) {
        try {
          const params: Record<string, string> = {};
          match.forEach((val, idx) => { params[idx.toString()] = val; });
          await route.handler(req, res, params, query);
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
    console.log("  GET  /v1/economics/:model");
    console.log("  GET  /v1/changes");
    console.log("  GET  /v1/evidence/:id");
    console.log("  GET  /v1/health");
  });

  return server;
}
