import { TOOLS, handleTool } from "../src/mcp/server.js";

describe("MCP", () => {
  it("has correct number of tools", () => {
    expect(TOOLS.length).toBe(5); // run_radar removed for read-only
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
