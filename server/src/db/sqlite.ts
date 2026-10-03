import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

export function openDb(dataDir: string): Db {
  let path = ':memory:';
  if (dataDir !== ':memory:') {
    mkdirSync(dataDir, { recursive: true });
    path = join(dataDir, 'spacefly.db');
  }
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      tokens TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fx_fallback (
      day TEXT NOT NULL,
      base TEXT NOT NULL,
      quote TEXT NOT NULL,
      rate REAL NOT NULL,
      PRIMARY KEY (day, base, quote)
    );
    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}
