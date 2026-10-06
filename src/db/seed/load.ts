import type { Cabin } from "@/config/fleet";
import { ROUTE_BY_ID } from "@/domain/network";
import type { FlightLeg } from "@/domain/types";

import type { Sql } from "../sql";

export type Queryable = Sql;

interface FlightRow {
  id: number;
  flight_number: number;
  route_id: number;
  origin: string;
  dest: string;
  aircraft_code: string;
  dep_local_date: string;
  dep_ms: number;
  arr_ms: number;
}

/** Load flights (with inventory) matching a WHERE clause on alias f. */
export async function loadLegs(q: Queryable, where: string, params: unknown[] = []): Promise<FlightLeg[]> {
  const { rows } = await q.query<FlightRow>(
    `SELECT f.id, f.flight_number, f.route_id, f.origin, f.dest, f.aircraft_code,
            f.dep_local_date::text AS dep_local_date,
            (extract(epoch FROM f.dep_utc) * 1000)::float8 AS dep_ms,
            (extract(epoch FROM f.arr_utc) * 1000)::float8 AS arr_ms
       FROM flights f WHERE f.status = 'SCHEDULED' AND ${where}`,
    params,
  );
  if (!rows.length) return [];
  const legs = new Map<number, FlightLeg>();
  for (const r of rows) {
    legs.set(r.id, {
      id: r.id,
      flightNumber: r.flight_number,
      routeId: r.route_id,
      origin: r.origin,
      dest: r.dest,
      aircraft: r.aircraft_code,
      depLocalDate: r.dep_local_date,
      depUtc: r.dep_ms,
      arrUtc: r.arr_ms,
      distanceKm: ROUTE_BY_ID.get(r.route_id)?.distanceKm ?? 0,
      inv: {},
    });
  }
  const inv = await q.query<{ flight_id: number; cabin: Cabin; capacity: number; sold: number }>(
    `SELECT i.flight_id, i.cabin, i.capacity, i.sold FROM flight_cabin_inventory i
       JOIN flights f ON f.id = i.flight_id WHERE f.status = 'SCHEDULED' AND ${where}`,
    params,
  );
  for (const r of inv.rows) {
    const l = legs.get(r.flight_id);
    if (l) l.inv[r.cabin] = { capacity: r.capacity, sold: r.sold };
  }
  return [...legs.values()];
}

export async function readState(q: Queryable): Promise<Record<string, string>> {
  const { rows } = await q.query<{ key: string; value: string }>(`SELECT key, value FROM seed_state`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function writeState(q: Queryable, state: Record<string, string | number>) {
  for (const [k, v] of Object.entries(state)) {
    await q.query(
      `INSERT INTO seed_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [k, String(v)],
    );
  }
}
