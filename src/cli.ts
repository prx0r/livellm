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
        const monthly = facts.find((f: any) => f.field === "monthly_price_usd");
        const requests = facts.find((f: any) => f.field === "requests_per_month");
        const providerUsage = facts.find((f: any) => f.field === "provider_usage_usd");

        if (input && monthly) {
          const result = calculateEconomics(entity, provider, name, {
            input_per_1m: input.value,
            output_per_1m: output?.value ?? input.value * 3,
            cached_input_per_1m: cached?.value,
            monthly_price: monthly.value,
            requests_per_month: requests?.value ?? 30000,
            provider_usage_usd: providerUsage?.value ?? 60,
          });
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
