// Spike: measure PGlite COPY throughput and transaction exclusivity under concurrency.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { mkdirSync, rmSync } from "node:fs";

const dir = "./.data/bench";
rmSync(dir, { recursive: true, force: true });
mkdirSync("./.data", { recursive: true });

async function main() {
  const pg = new PGlite(dir, { relaxedDurability: true });
  await pg.exec(`CREATE TABLE t (id int primary key, booking_id int, flight_id int, cabin char(1), seats smallint, base_cents int, name text);
                 CREATE INDEX ON t(flight_id); CREATE INDEX ON t(booking_id);`);
  const N = 500_000, CHUNK = 50_000;
  const t0 = performance.now();
  for (let s = 0; s < N; s += CHUNK) {
    const lines: string[] = [];
    for (let i = s; i < s + CHUNK; i++) lines.push(`${i}\t${i >> 1}\t${i % 20000}\tY\t${1 + (i % 3)}\t${10000 + i % 5000}\tSMITH${i % 97}`);
    await pg.query(`COPY t FROM '/dev/blob'`, [], { blob: new Blob([lines.join("\n") + "\n"]) });
  }
  const t1 = performance.now();
  console.log(`COPY ${N} rows: ${((t1 - t0) / 1000).toFixed(2)}s (${Math.round(N / ((t1 - t0) / 1000))} rows/s)`);
  const r = await pg.query(`SELECT count(*) FROM t WHERE flight_id = 123`);
  console.log("count", r.rows, `${(performance.now() - t1).toFixed(1)}ms`);

  // Exclusivity: 50 concurrent "take the last seat" transactions via drizzle.
  await pg.exec(`CREATE TABLE inv (id int primary key, capacity int, sold int, CHECK (sold <= capacity));
                 INSERT INTO inv VALUES (1, 10, 9);`);
  const db = drizzle({ client: pg });
  const results = await Promise.allSettled(
    Array.from({ length: 50 }, () =>
      db.transaction(async (tx) => {
        const rows = await tx.execute(sql`SELECT sold, capacity FROM inv WHERE id = 1 FOR UPDATE`);
        const { sold, capacity } = rows.rows[0] as { sold: number; capacity: number };
        await new Promise((r) => setTimeout(r, 1));
        if (capacity - sold < 1) throw new Error("SOLD_OUT");
        await tx.execute(sql`UPDATE inv SET sold = sold + 1 WHERE id = 1`);
      }),
    ),
  );
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const reasons = new Set(results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason?.message ?? r).slice(0, 80)));
  const final = await pg.query(`SELECT sold FROM inv WHERE id = 1`);
  console.log(`concurrent last-seat: ${ok} succeeded, final`, final.rows, [...reasons]);
  await pg.close();
  rmSync(dir, { recursive: true, force: true });
}
main().catch((e) => { console.error(e); process.exit(1); });
