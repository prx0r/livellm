import { readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { TOOLS, handleTool } from "../src/mcp/server.js";
import { openDb, saveDb } from "../src/db/open.js";

// Set up a fresh test database before all tests
let testDbPath: string;

beforeAll(async () => {
  testDbPath = resolve(process.cwd(), "data", "test-mcp.db");
  
  // Open and migrate test database
  const db = await openDb(testDbPath);
  const schemaPath = resolve(process.cwd(), "db/001_serpapi_radar.sql");
  const sql = readFileSync(schemaPath, "utf8");
  const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith("--"));
  for (const stmt of statements) {
    try { db.run(stmt); } catch {}
  }
  saveDb();
});

afterAll(() => {
  try { unlinkSync(testDbPath); } catch {}
});

describe("MCP", () => {
  it("has correct number of tools", () => {
    expect(TOOLS.length).toBe(5);
  });

  it("all tools have required fields", () => {
    for (const tool of TOOLS) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("get_market_snapshot returns text", async () => {
    const result = await handleTool("get_market_snapshot", {});
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });

  it("get_recent_changes returns text", async () => {
    const result = await handleTool("get_recent_changes", { limit: 5 });
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });

  it("get_candidates returns text", async () => {
    const result = await handleTool("get_candidates", {});
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });

  it("unknown tool returns error", async () => {
    const result = await handleTool("unknown_tool", {});
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("run_radar is not in default tools", () => {
    const toolNames = TOOLS.map((t) => t.name);
    expect(toolNames).not.toContain("run_radar");
  });
});
