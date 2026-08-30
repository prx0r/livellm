#!/usr/bin/env node

import { parseArgs } from "node:util";
import { config } from "dotenv";
import { resolve } from "node:path";

config();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    mode: { type: "string", short: "m" },
    "fixture-dir": { type: "string" },
    query: { type: "string", short: "q" },
    engine: { type: "string", short: "e" },
    format: { type: "string" },
    port: { type: "string" },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
livellm — Live truth and market-intelligence layer for AI

Usage:
  livellm <command> [options]

Commands:
  migrate     Run database migrations
  account     Show SerpApi account/quota status
  radar       Run one radar cycle (discover → candidates → verify)
  official    Run official-source discovery (targeted site: queries)
  investigate Investigate candidates with AI extraction
  economics   Calculate LLM economics (MiMo 6×, Kimi 10.5×, etc.)
  facts       Show current facts in the ledger
  changes     Show recent change events
  materialize Materialize current state from fact ledger
  md          Generate Markdown payload for agents
  summary     Ultra-compact market summary
  tool        Generate structured tool output
  mcp         Start MCP server (stdio)
  dashboard   Generate Live Radar dashboard HTML
  record      Record live SerpApi responses as fixtures
  replay      Test against recorded fixtures
  demo        Full demo cycle with output
  seed        Seed discovery queries into database

Options:
  -m, --mode <live|replay>       Search mode (default: from .env)
      --fixture-dir <path>       Fixture directory for replay mode
  -q, --query <text>             Override query text
  -e, --engine <engine>          Override search engine
  -h, --help                     Show this help
`);
  process.exit(0);
}

const command = positionals[0];
const cwd = process.cwd();

async function run() {
  switch (command) {
    case "migrate": {
      const { migrate } = await import("./db/migrate.js");
      await migrate(resolve(cwd, "data", "livellm.db"));
      console.log("Migration complete.");
      break;
    }

    case "account": {
      const { getSerpApiAccount } = await import("./search/account.js");
      const acct = await getSerpApiAccount();
      console.log(JSON.stringify(acct, null, 2));
      break;
    }

    case "radar": {
      const { runRadar } = await import("./radar.js");
      await runRadar({
        mode: (values.mode as string) ?? process.env.LLMDEALS_SEARCH_MODE ?? "replay",
        fixtureDir: values["fixture-dir"] as string ?? process.env.LLMDEALS_FIXTURE_DIR,
        dbPath: resolve(cwd, "data", "livellm.db"),
      });
      break;
    }

    case "record": {
      const { runRecord } = await import("./record.js");
      await runRecord({
        fixtureDir: values["fixture-dir"] ?? "./fixtures/serpapi",
        query: values.query as string | undefined,
        engine: values.engine as string | undefined,
      });
      break;
    }

    case "replay": {
      const { runReplay } = await import("./replay-run.js");
      await runReplay({
        fixtureDir: values["fixture-dir"] ?? process.env.LLMDEALS_FIXTURE_DIR ?? "./fixtures/serpapi",
        dbPath: resolve(cwd, "data", "livellm.db"),
      });
      break;
    }

    case "demo": {
      const { runDemo } = await import("./demo.js");
      await runDemo({
        mode: (values.mode as string) ?? "replay",
        fixtureDir: values["fixture-dir"] as string,
        dbPath: resolve(cwd, "data", "livellm.db"),
      });
      break;
    }

    case "seed": {
      const { seedQueries } = await import("./db/seed.js");
      await seedQueries(resolve(cwd, "data", "livellm.db"));
      console.log("Discovery queries seeded.");
      break;
    }

    case "seed-economics": {
      const { seedEconomics } = await import("./db/seed-economics.js");
      await seedEconomics(resolve(cwd, "data", "livellm.db"));
      break;
    }

    case "official": {
      const { runOfficialDiscovery } = await import("./pipeline/official-discovery.js");
      await runOfficialDiscovery({
        fixtureDir: resolve(cwd, "fixtures", "official"),
        maxSearches: parseInt(values.mode ?? "8"),
      });
      break;
    }

    case "investigate": {
      const { investigateCandidates } = await import("./pipeline/run-investigate.js");
      await investigateCandidates({
        dbPath: resolve(cwd, "data", "livellm.db"),
        replayDir: values["fixture-dir"] ?? resolve(cwd, "fixtures", "ai"),
      });
      break;
    }

    case "economics": {
      const { calculateEconomics, formatEconomics } = await import("./facts/economics.js");
      const { FactRepo } = await import("./db/facts.js");
      const repo = new FactRepo();
      const entities = await repo.getEntities();

      for (const entity of entities) {
        const [provider, ...nameParts] = entity.split(":");
        const name = nameParts.join(":") || provider;
        const facts = await repo.getEntityFacts(entity);

        const input = facts.find((f: any) => f.field === "input_price_usd_per_million");
        const output = facts.find((f: any) => f.field === "output_price_usd_per_million");
        const cached = facts.find((f: any) => f.field === "cached_input_price_usd_per_million");
        const subscription = facts.find((f: any) => f.field === "subscription_price_usd_month");
        const usageValue = facts.find((f: any) => f.field === "usage_value_usd_month");
        const requests = facts.find((f: any) => f.field === "request_limit_month");
        const inputTokens = facts.find((f: any) => f.field === "input_tokens_per_request");
        const cachedTokens = facts.find((f: any) => f.field === "cached_tokens_per_request");
        const outputTokens = facts.find((f: any) => f.field === "output_tokens_per_request");
        const promoMultiplier = facts.find((f: any) => f.field === "promotion_multiplier");
        const promoEndAt = facts.find((f: any) => f.field === "promotion_end_at");

        if (input && subscription) {
          const result = calculateEconomics(entity, provider, name,
            {
              kind: "subscription",
              monthlyPrice: subscription.value,
              inputPerMillion: input.value,
              outputPerMillion: output?.value ?? 0,
              cachedInputPerMillion: cached?.value,
              usageValueUsd: usageValue?.value,
              requestsPerMonth: requests?.value,
              promotionMultiplier: promoMultiplier?.value,
              promotionEndAt: promoEndAt?.value,
            },
            {
              uncachedInputTokens: inputTokens?.value ?? 0,
              cachedInputTokens: cachedTokens?.value ?? 0,
              outputTokens: outputTokens?.value ?? 0,
            }
          );
          console.log(formatEconomics(result));
          console.log("");
        } else if (input) {
          // PAYG
          const result = calculateEconomics(entity, provider, name,
            {
              kind: "payg",
              inputPerMillion: input.value,
              outputPerMillion: output?.value ?? 0,
              cachedInputPerMillion: cached?.value,
            },
            {
              uncachedInputTokens: inputTokens?.value ?? 1000,
              cachedInputTokens: cachedTokens?.value ?? 0,
              outputTokens: outputTokens?.value ?? 200,
            }
          );
          console.log(formatEconomics(result));
          console.log("");
        }
      }
      break;
    }

    case "facts": {
      const { FactRepo } = await import("./db/facts.js");
      const repo = new FactRepo();
      const entities = await repo.getEntities();
      if (entities.length === 0) {
        console.log("No facts in ledger.");
      }
      for (const entity of entities) {
        const facts = await repo.getEntityFacts(entity);
        console.log(`\n${entity}:`);
        for (const f of facts) {
          console.log(`  ${f.field}: ${JSON.stringify(f.value)} ${f.unit ?? ""}`);
        }
      }
      break;
    }

    case "changes": {
      const { FactRepo } = await import("./db/facts.js");
      const repo = new FactRepo();
      const changes = await repo.getRecentChanges(20);
      if (changes.length === 0) {
        console.log("No change events yet.");
      }
      for (const c of changes) {
        console.log(`[${c.detected_at}] ${c.entity_id} ${c.field}: ${c.before_json} → ${c.after_json}`);
      }
      break;
    }

    case "materialize": {
      const { materializeState } = await import("./facts/materialize.js");
      const state = await materializeState(resolve(cwd, "data", "livellm.db"));
      console.log(JSON.stringify(state, null, 2));
      break;
    }

    case "md": {
      const { generateMdPayload } = await import("./agents/md-payload.js");
      const md = await generateMdPayload(resolve(cwd, "data", "livellm.db"), {
        includeEvidence: false,
        includeChanges: true,
        format: (values.format as "compact" | "full" | "json") ?? "compact",
      });
      console.log(md);
      break;
    }

    case "summary": {
      const { generateCompactSummary } = await import("./agents/md-payload.js");
      const summary = await generateCompactSummary(resolve(cwd, "data", "livellm.db"));
      console.log(summary);
      break;
    }

    case "tool": {
      const { generateToolOutput } = await import("./agents/md-payload.js");
      const output = await generateToolOutput(resolve(cwd, "data", "livellm.db"));
      console.log(JSON.stringify(output, null, 2));
      break;
    }

    case "mcp": {
      const { TOOLS, handleTool } = await import("./mcp/server.js");
      const readline = await import("node:readline");

      // Simple stdio MCP server
      process.stderr.write("LiveLLM MCP server started (stdio)\n");

      const rl = readline.createInterface({ input: process.stdin });
      rl.on("line", async (line) => {
        try {
          const msg = JSON.parse(line);
          if (msg.method === "tools/list") {
            process.stdout.write(JSON.stringify({ tools: TOOLS }) + "\n");
          } else if (msg.method === "tools/call") {
            const result = await handleTool(msg.params.name, msg.params.arguments ?? {});
            process.stdout.write(JSON.stringify(result) + "\n");
          } else if (msg.method === "ping") {
            process.stdout.write(JSON.stringify({ pong: true }) + "\n");
          }
        } catch (err: any) {
          process.stdout.write(JSON.stringify({ error: err.message }) + "\n");
        }
      });
      break;
    }

    case "evaluate": {
      const { EvaluationTracker } = await import("./pipeline/evaluation.js");
      const tracker = new EvaluationTracker();
      const metrics = await tracker.getMetrics();
      console.log(tracker.formatMetrics(metrics));
      break;
    }

    case "promotions": {
      const { PromotionDetector } = await import("./pipeline/promotions.js");
      const detector = new PromotionDetector();
      const promos = await detector.getActivePromotions();
      if (promos.length === 0) {
        console.log("No active promotions detected.");
      } else {
        console.log(`Active promotions: ${promos.length}\n`);
        for (const p of promos) {
          console.log(`${p.entity}`);
          console.log(`  Type: ${p.type}`);
          console.log(`  Value: ${p.value}${p.unit}`);
          if (p.listPrice) console.log(`  List: $${p.listPrice}`);
          if (p.currentPrice) console.log(`  Current: $${p.currentPrice}`);
          if (p.discountPct) console.log(`  Discount: ${p.discountPct.toFixed(0)}%`);
          if (p.endsAt) console.log(`  Ends: ${p.endsAt}`);
          console.log("");
        }
      }
      break;
    }

    case "alerts": {
      const { AlertGenerator } = await import("./pipeline/alerts.js");
      const gen = new AlertGenerator();
      const alerts = await gen.generateAlerts();
      if (alerts.length === 0) {
        console.log("No alerts.");
      } else {
        console.log(`Alerts: ${alerts.length}\n`);
        for (const a of alerts) {
          const icon = a.severity === "critical" ? "🔴" : a.severity === "warning" ? "🟡" : "🔵";
          console.log(`${icon} ${a.title}`);
          console.log(`   ${a.entity}: ${a.message}`);
          console.log("");
        }
      }
      break;
    }

    case "compare": {
      const { PriceComparator } = await import("./pipeline/price-compare.js");
      const comp = new PriceComparator();
      const changes = await comp.getRecentChanges(30);
      if (changes.length === 0) {
        console.log("No price changes in last 30 days.");
      } else {
        console.log(`Price changes: ${changes.length}\n`);
        for (const c of changes) {
          const icon = c.changePct > 0 ? "📈" : "📉";
          console.log(`${icon} ${c.entity} ${c.field}`);
          console.log(`   ${c.previousValue} → ${c.currentValue} (${c.changePct > 0 ? "+" : ""}${c.changePct.toFixed(1)}%)`);
          console.log("");
        }
      }
      break;
    }

    case "serve": {
      const { createServer } = await import("./api/server.js");
      const port = parseInt(values.port as string ?? "3847");
      createServer(port);
      break;
    }

    case "daily": {
      const { runDaily } = await import("./pipeline/daily.js");
      await runDaily({
        dbPath: resolve(cwd, "data", "livellm.db"),
        fixtureDir: resolve(cwd, "fixtures"),
        mode: (values.mode as string) ?? "live",
      });
      break;
    }

    case "changes-detect": {
      const { ChangeDetector } = await import("./pipeline/change-detector.js");
      const detector = new ChangeDetector();
      const stale = await detector.getStaleUrls(24);
      console.log(`URLs older than 24h: ${stale.length}`);
      for (const url of stale.slice(0, 10)) {
        console.log(`  ${url}`);
      }
      break;
    }

    case "assets": {
      const { AssetStore } = await import("./db/assets.js");
      const store = new AssetStore();
      const stats = await store.getStats();
      console.log("Asset Store Statistics:");
      console.log(`  Total assets: ${stats.totalAssets}`);
      console.log(`  By type:`);
      for (const [type, count] of Object.entries(stats.byType)) {
        console.log(`    ${type}: ${count}`);
      }
      if (stats.oldestAsset) console.log(`  Oldest: ${stats.oldestAsset}`);
      if (stats.newestAsset) console.log(`  Newest: ${stats.newestAsset}`);
      break;
    }

    case "glm-demo": {
      const { runGlmDemo } = await import("./demo/glm-promo.js");
      await runGlmDemo();
      break;
    }

    case "dashboard": {
      const { generateDashboard } = await import("./dashboard.js");
      const { writeFileSync } = await import("node:fs");
      const html = await generateDashboard(resolve(cwd, "data", "livellm.db"));
      const outPath = resolve(cwd, "dist", "dashboard.html");
      writeFileSync(outPath, html);
      console.log(`Dashboard generated: ${outPath}`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
