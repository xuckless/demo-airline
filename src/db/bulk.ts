import type { Sql } from "./sql";

type Cell = string | number | boolean | null | undefined | Date;

const esc = (v: Cell): string => {
  if (v === null || v === undefined) return "\\N";
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  return /[\t\n\\\r]/.test(s) ? s.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r") : s;
};

/** Fast bulk load via COPY (PGlite blob locally, COPY FROM STDIN on Postgres). */
export async function copyRows(q: Sql, table: string, columns: string[], rows: Iterable<Cell[]>, chunk = 50_000) {
  let buf: string[] = [];
  let n = 0;
  const flush = async () => {
    if (!buf.length) return;
    await q.copyText(table, columns, buf.join("\n") + "\n");
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
