import type { Queryable } from "./load";

export interface CheckResult {
  mismatches: number;
  oversold: number;
  stats: { bucket: string; flights: number; lf: number }[];
  counts: Record<string, number>;
}

/** Verify inventory.sold == confirmed seats on segments, and report load factors by days out. */
export async function checkConsistency(q: Queryable, today: string): Promise<CheckResult> {
  const mm = await q.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM flight_cabin_inventory i
       LEFT JOIN (SELECT s.flight_id, s.cabin, sum(s.seats)::int AS seats
                    FROM booking_segments s JOIN bookings b ON b.id = s.booking_id AND b.status = 'CONFIRMED'
                   GROUP BY 1, 2) x ON x.flight_id = i.flight_id AND x.cabin = i.cabin
      WHERE i.sold <> COALESCE(x.seats, 0)`,
  );
  const over = await q.query<{ n: number }>(`SELECT count(*)::int AS n FROM flight_cabin_inventory WHERE sold > capacity`);
  const stats = await q.query<{ bucket: string; flights: number; lf: number }>(
    `WITH d AS (
       SELECT (f.dep_local_date - $1::date) AS days_out, sum(i.sold)::float / sum(i.capacity) AS lf, count(DISTINCT f.id) AS n
         FROM flights f JOIN flight_cabin_inventory i ON i.flight_id = f.id GROUP BY f.id, f.dep_local_date)
     SELECT CASE WHEN days_out < 0 THEN 'past'
                 WHEN days_out <= 3 THEN '0-3'
                 WHEN days_out <= 7 THEN '4-7'
                 WHEN days_out <= 28 THEN '8-28'
                 WHEN days_out <= 60 THEN '29-60'
                 ELSE '61+' END AS bucket,
            count(*)::int AS flights, round(avg(lf)::numeric, 3)::float AS lf
       FROM d GROUP BY 1 ORDER BY min(days_out)`,
    [today],
  );
  const counts: Record<string, number> = {};
  for (const t of ["flights", "flight_cabin_inventory", "bookings", "passengers", "booking_segments"]) {
    counts[t] = (await q.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
  }
  return { mismatches: mm.rows[0].n, oversold: over.rows[0].n, stats: stats.rows, counts };
}
