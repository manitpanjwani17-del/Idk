import { createClient, type Client, type InArgs } from "@libsql/client";
import { connection } from "next/server";
import fs from "node:fs";
import path from "node:path";

/**
 * libSQL works with a local SQLite file (default) or a hosted Turso database
 * (set DATABASE_URL=libsql://… and DATABASE_AUTH_TOKEN). Same code either way.
 */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    recovery_hash TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    parent_id TEXT,
    status TEXT NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    emoji TEXT NOT NULL,
    mode TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    perks TEXT NOT NULL,
    cta TEXT NOT NULL,
    eta TEXT NOT NULL,
    theme TEXT NOT NULL,
    ask_price INTEGER NOT NULL DEFAULT 1,
    image_version INTEGER NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL,
    target_visitors INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    closed_at INTEGER,
    verdict TEXT,
    card_public INTEGER NOT NULL DEFAULT 1,
    hidden INTEGER NOT NULL DEFAULT 0,
    offer_changed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS tests_user ON tests(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS test_images (
    test_id TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data BLOB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT NOT NULL,
    type TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS events_once ON events(test_id, type, visitor_id)`,
  `CREATE TABLE IF NOT EXISTS signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id TEXT NOT NULL,
    email TEXT NOT NULL,
    would_pay_cents INTEGER,
    visitor_id TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(test_id, email)
  )`,
  `CREATE INDEX IF NOT EXISTS signups_visitor ON signups(test_id, visitor_id)`,
  `CREATE TABLE IF NOT EXISTS reports (
    test_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (test_id, visitor_id)
  )`,
  `CREATE TABLE IF NOT EXISTS interest (
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, feature)
  )`,
];

interface DbState {
  client: Client;
  ready: Promise<void>;
}

declare global {
  // Reused across hot reloads in dev so we don't open a new connection per edit.
  var __validlyDb: DbState | undefined;
}

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = path.join(process.cwd(), "data", "validly.db");
  return `file:${file}`;
}

async function migrate(client: Client, local: boolean): Promise<void> {
  if (local) {
    await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA busy_timeout = 5000");
  }
  await client.batch(SCHEMA, "write");
}

function init(): DbState {
  const url = databaseUrl();
  const local = url.startsWith("file:");
  if (local) fs.mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  const ready = migrate(client, local);
  // If migration fails, let the next request retry instead of caching the failure.
  ready.catch(() => {
    globalThis.__validlyDb = undefined;
  });
  return { client, ready };
}

export async function db(): Promise<Client> {
  // Data is always per-request: never let a prerender read it (or the clock after it).
  await connection();
  if (!globalThis.__validlyDb) globalThis.__validlyDb = init();
  await globalThis.__validlyDb.ready;
  return globalThis.__validlyDb.client;
}

export type Row = Record<string, unknown>;

export async function all<T = Row>(sql: string, args: InArgs = []): Promise<T[]> {
  const res = await (await db()).execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function one<T = Row>(sql: string, args: InArgs = []): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InArgs = []): Promise<number> {
  const res = await (await db()).execute({ sql, args });
  return res.rowsAffected;
}

export async function batch(statements: Array<{ sql: string; args?: InArgs }>): Promise<void> {
  await (await db()).batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write",
  );
}
