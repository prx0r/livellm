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

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
