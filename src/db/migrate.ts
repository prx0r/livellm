import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openDb, saveDb } from "./open.js";

export async function migrate(dbPath?: string): Promise<void> {
  const db = await openDb(dbPath);
  const schemaPath = resolve(
    import.meta.dirname ?? process.cwd(),
    "../../db/001_serpapi_radar.sql"
  );
  const sql = readFileSync(schemaPath, "utf8");
  // Split by semicolons and execute each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const stmt of statements) {
    try {
      db.run(stmt);
    } catch (err: any) {
      // Ignore "table already exists" errors
      if (!err.message?.includes("already exists")) {
        console.error(`Migration error: ${err.message}`);
      }
    }
  }
  saveDb();
}
