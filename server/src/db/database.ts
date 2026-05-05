import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import Database, { type Database as Db } from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

let cached: Db | undefined;

function resolveDbPath(): string {
  const raw = process.env.RECIPE_DB_PATH ?? './data/recipes.db';
  if (raw === ':memory:') return raw;
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

export function getDb(): Db {
  if (cached) return cached;
  const path = resolveDbPath();
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  cached = db;
  return db;
}

export function closeDb(): void {
  if (cached) {
    cached.close();
    cached = undefined;
  }
}
