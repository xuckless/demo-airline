import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { acquireLock } from "./lock";
import { fromPglite, fromPgPool, type SqlDb } from "./sql";

export interface DbHandle {
  pg: SqlDb;
  close: () => Promise<void>;
}

export const DATA_DIR = process.env.PGLITE_DIR ?? join(process.cwd(), ".data", "pglite");
export const LOCK_PATH = `${DATA_DIR}.lock`;
const MIGRATIONS = join(process.cwd(), "drizzle");

/** Hosted Postgres (Supabase) when DATABASE_URL is set; otherwise embedded PGlite. */
export const databaseUrl = () => process.env.DATABASE_URL?.trim() || undefined;

// Keep DATE columns as "YYYY-MM-DD" strings, matching PGlite.
pg.types.setTypeParser(1082, (v) => v);

/** Open (and migrate) an embedded database. `dir` undefined = in-memory (tests). */
export async function openDb(opts: { dir?: string; holder?: string } = {}): Promise<DbHandle> {
  let release = () => {};
  if (opts.dir) {
    release = acquireLock(`${opts.dir}.lock`, opts.holder ?? "app");
    mkdirSync(opts.dir, { recursive: true });
  }
  let pgl = new PGlite(opts.dir, { relaxedDurability: true });
  if (opts.dir) {
    // Keep the on-disk WAL small (bulk seeding would otherwise leave ~1 GB behind).
    const { rows } = await pgl.query<{ max_wal_size: string }>("SHOW max_wal_size");
    if (rows[0]?.max_wal_size !== "64MB") {
      await pgl.query("ALTER SYSTEM SET max_wal_size = '64MB'");
      await pgl.query("ALTER SYSTEM SET min_wal_size = '32MB'");
      await pgl.close();
      pgl = new PGlite(opts.dir, { relaxedDurability: true });
    }
  }
  await migratePglite(drizzlePglite({ client: pgl }), { migrationsFolder: MIGRATIONS });
  const sql = fromPglite(pgl);
  return {
    pg: sql,
    close: async () => {
      await sql.close();
      release();
    },
  };
}

/** Connect to hosted Postgres. Migrations run from `pnpm db:setup`, not on every server start. */
export async function openPostgres(url: string, opts: { migrate?: boolean; max?: number } = {}): Promise<DbHandle> {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  const local = ["localhost", "127.0.0.1"].includes(u.hostname);
  const pool = new pg.Pool({
    connectionString: u.toString(),
    ssl: local ? undefined : { rejectUnauthorized: false },
    max: opts.max ?? (process.env.VERCEL ? 3 : 10),
    idleTimeoutMillis: 10_000,
  });
  if (opts.migrate) await migratePg(drizzlePg({ client: pool }), { migrationsFolder: MIGRATIONS });
  const sql = fromPgPool(pool);
  return { pg: sql, close: () => sql.close() };
}

/** Open whichever database this environment uses (CLI scripts). */
export function openConfigured(holder: string, opts: { migrate?: boolean } = {}) {
  const url = databaseUrl();
  return url ? openPostgres(url, { migrate: opts.migrate ?? true, max: 4 }) : openDb({ dir: DATA_DIR, holder });
}

const g = globalThis as unknown as { __demoAirlinesDb?: Promise<DbHandle> };

/** Process-wide singleton for the app server; survives dev HMR. */
export function getDb(): Promise<DbHandle> {
  const url = databaseUrl();
  g.__demoAirlinesDb ??= (url ? openPostgres(url) : openDb({ dir: DATA_DIR, holder: "next-server" })).catch((e) => {
    g.__demoAirlinesDb = undefined;
    throw e;
  });
  return g.__demoAirlinesDb;
}
