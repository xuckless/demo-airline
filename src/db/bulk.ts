import type { PGlite } from "@electric-sql/pglite";

type Cell = string | number | boolean | null | undefined | Date;

const esc = (v: Cell): string => {
  if (v === null || v === undefined) return "\\N";
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  return /[\t\n\\\r]/.test(s) ? s.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r") : s;
};

/**
 * Fast bulk load via PGlite's COPY FROM '/dev/blob' (text format).
 * Kept behind this module so a node-postgres COPY stream can replace it for Supabase.
 */
export async function copyRows(pg: Pick<PGlite, "query">, table: string, columns: string[], rows: Iterable<Cell[]>, chunk = 50_000) {
  let buf: string[] = [];
  let n = 0;
  const flush = async () => {
    if (!buf.length) return;
    const blob = new Blob([buf.join("\n") + "\n"]);
    await pg.query(`COPY ${table} (${columns.join(", ")}) FROM '/dev/blob'`, [], { blob });
    buf = [];
  };
  for (const r of rows) {
    buf.push(r.map(esc).join("\t"));
    n++;
    if (buf.length >= chunk) await flush();
  }
  await flush();
  return n;
}
