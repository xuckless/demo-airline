import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { acquireLock } from "./lock";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema>;
export interface DbHandle {
  pg: PGlite;
  db: Db;
  close: () => Promise<void>;
}

export const DATA_DIR = process.env.PGLITE_DIR ?? join(process.cwd(), ".data", "pglite");
export const LOCK_PATH = `${DATA_DIR}.lock`;
const MIGRATIONS = join(process.cwd(), "drizzle");

/** Open (and migrate) a database. `dir` undefined = in-memory (tests). */
export async function openDb(opts: { dir?: string; holder?: string } = {}): Promise<DbHandle> {
  let release = () => {};
  if (opts.dir) {
    release = acquireLock(`${opts.dir}.lock`, opts.holder ?? "app");
    mkdirSync(opts.dir, { recursive: true });
  }
  let pg = new PGlite(opts.dir, { relaxedDurability: true });
  if (opts.dir) {
    // Keep the on-disk WAL small (bulk seeding would otherwise leave ~1 GB behind).
    const { rows } = await pg.query<{ max_wal_size: string }>("SHOW max_wal_size");
    if (rows[0]?.max_wal_size !== "64MB") {
      await pg.query("ALTER SYSTEM SET max_wal_size = '64MB'");
      await pg.query("ALTER SYSTEM SET min_wal_size = '32MB'");
      await pg.close();
      pg = new PGlite(opts.dir, { relaxedDurability: true });
    }
  }
  const db = drizzle({ client: pg, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return {
    pg,
    db,
    close: async () => {
      await pg.close();
      release();
    },
  };
}

const g = globalThis as unknown as { __demoAirlinesDb?: Promise<DbHandle> };

/** Process-wide singleton for the app server; survives dev HMR. */
export function getDb(): Promise<DbHandle> {
  g.__demoAirlinesDb ??= openDb({ dir: DATA_DIR, holder: "next-server" }).catch((e) => {
    g.__demoAirlinesDb = undefined;
    throw e;
  });
  return g.__demoAirlinesDb;
}
