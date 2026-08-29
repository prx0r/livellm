import { resolve } from "node:path";
import { existsSync, rmSync } from "node:fs";
import { runRadar } from "../src/radar.js";
import { migrate } from "../src/db/migrate.js";
import { seedQueries } from "../src/db/seed.js";
import { closeDb } from "../src/db/open.js";

const FIXTURE_DIR = resolve(process.cwd(), "fixtures", "serpapi");
const DB_PATH = resolve(process.cwd(), "data", "test-livellm.db");

beforeAll(async () => {
  if (existsSync(DB_PATH)) rmSync(DB_PATH);
  await migrate(DB_PATH);
  await seedQueries(DB_PATH);
});

afterAll(() => {
  closeDb();
  if (existsSync(DB_PATH)) rmSync(DB_PATH);
});

describe("radar pipeline (replay mode)", () => {
  it("runs all queries and returns results", async () => {
    const results = await runRadar({
      mode: "replay",
      fixtureDir: FIXTURE_DIR,
      dbPath: DB_PATH,
    });

    expect(results.length).toBe(4);
    expect(results.every((r) => r.rawHits > 0)).toBe(true);
    expect(results.every((r) => r.searchId)).toBe(true);
  });

  it("deduplicates on second run", async () => {
    await runRadar({
      mode: "replay",
      fixtureDir: FIXTURE_DIR,
      dbPath: DB_PATH,
    });

    const results = await runRadar({
      mode: "replay",
      fixtureDir: FIXTURE_DIR,
      dbPath: DB_PATH,
    });

    expect(results.every((r) => r.newUrls === 0)).toBe(true);
    expect(results.every((r) => r.candidates === 0)).toBe(true);
  });
});
