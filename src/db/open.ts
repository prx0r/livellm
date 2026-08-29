import initSqlJs, { type Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

let _db: Database | null = null;
let _dbPath: string = "";

export async function openDb(dbPath?: string): Promise<Database> {
  if (_db) return _db;
  const SQL = await initSqlJs();
  _dbPath = dbPath ?? resolve(process.cwd(), "data", "livellm.db");
  mkdirSync(dirname(_dbPath), { recursive: true });

  if (existsSync(_dbPath)) {
    const buf = readFileSync(_dbPath);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run("PRAGMA journal_mode = WAL");
  _db.run("PRAGMA foreign_keys = ON");
  return _db;
}

export function saveDb(): void {
  if (_db && _dbPath) {
    const data = _db.export();
    writeFileSync(_dbPath, Buffer.from(data));
  }
}

export function closeDb(): void {
  saveDb();
  _db = null;
}
