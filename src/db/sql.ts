import type { PGlite, Transaction } from "@electric-sql/pglite";
import type { Pool, PoolClient } from "pg";
import { from as copyFrom } from "pg-copy-streams";

export interface QueryResult<T> {
  rows: T[];
  affectedRows?: number;
}

/** The minimal SQL surface the app uses, implemented by PGlite (local) and node-postgres (Supabase). */
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Bulk-load rows in Postgres text COPY format (tab-separated, \N for null). */
  copyText(table: string, columns: string[], text: string): Promise<void>;
}

export interface SqlDb extends Sql {
  kind: "pglite" | "postgres";
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const copySql = (table: string, columns: string[], source: string) => `COPY ${table} (${columns.join(", ")}) FROM ${source}`;

function pgliteSql(q: PGlite | Transaction): Sql {
  return {
    query: async <T,>(text: string, params?: unknown[]) => {
      const r = await q.query<T>(text, params);
      return { rows: r.rows, affectedRows: r.affectedRows };
    },
    copyText: async (table, columns, text) => {
      await q.query(copySql(table, columns, "'/dev/blob'"), [], { blob: new Blob([text]) });
    },
  };
}

export function fromPglite(pg: PGlite): SqlDb {
  return {
    kind: "pglite",
    ...pgliteSql(pg),
    // PGlite transactions are exclusive: other queries wait until this one finishes.
    transaction: (fn) => pg.transaction((tx) => fn(pgliteSql(tx))),
    close: () => pg.close(),
  };
}

function clientSql(c: PoolClient): Sql {
  return {
    query: async <T,>(text: string, params?: unknown[]) => {
      const r = await c.query(text, params);
      return { rows: r.rows as T[], affectedRows: r.rowCount ?? undefined };
    },
    copyText: (table, columns, text) =>
      new Promise<void>((resolve, reject) => {
        const stream = c.query(copyFrom(copySql(table, columns, "STDIN")));
        stream.on("error", reject);
        stream.on("finish", () => resolve());
        stream.end(text);
      }),
  };
}

export function fromPgPool(pool: Pool): SqlDb {
  const withClient = async <T,>(fn: (c: PoolClient) => Promise<T>) => {
    const c = await pool.connect();
    try {
      return await fn(c);
    } finally {
      c.release();
    }
  };
  return {
    kind: "postgres",
    query: async <T,>(text: string, params?: unknown[]) => {
      const r = await pool.query(text, params);
      return { rows: r.rows as T[], affectedRows: r.rowCount ?? undefined };
    },
    copyText: (table, columns, text) => withClient((c) => clientSql(c).copyText(table, columns, text)),
    transaction: (fn) =>
      withClient(async (c) => {
        await c.query("BEGIN");
        try {
          const out = await fn(clientSql(c));
          await c.query("COMMIT");
          return out;
        } catch (e) {
          await c.query("ROLLBACK").catch(() => {});
          throw e;
        }
      }),
    close: () => pool.end(),
  };
}
