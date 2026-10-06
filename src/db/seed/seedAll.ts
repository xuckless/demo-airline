import { seedConfig } from "@/config/seed";
import { generateSchedules } from "@/domain/schedule/generateSchedules";
import { materializeFlights } from "@/domain/schedule/materializeFlights";
import { offsetPeriods } from "@/domain/schedule/periods";
import { mulberry32 } from "@/domain/rng";
import {
  BOOKING_COLUMNS,
  generateTraffic,
  PASSENGER_COLUMNS,
  SEGMENT_COLUMNS,
  seedBookedAt,
  type TrafficSink,
  withTargets,
} from "@/domain/seed/traffic";
import { addDays, type DateStr } from "@/domain/time";
import type { FlightLeg } from "@/domain/types";
import { ROUTE_BY_ID } from "@/domain/network";
import { copyRows } from "../bulk";
import { type Queryable, writeState } from "./load";
import { insertFlights, insertReferenceData, insertSchedules, resetSequences } from "./reference";

export const SCHEDULE_LOOKAHEAD_DAYS = 400;

export function copySink(q: Queryable): TrafficSink {
  const sink: TrafficSink = {
    bookings: [],
    passengers: [],
    segments: [],
    flush: async () => {
      // FK order: bookings first.
      await copyRows(q, "bookings", BOOKING_COLUMNS, sink.bookings);
      await copyRows(q, "passengers", PASSENGER_COLUMNS, sink.passengers);
      await copyRows(q, "booking_segments", SEGMENT_COLUMNS, sink.segments);
      sink.bookings.length = 0;
      sink.passengers.length = 0;
      sink.segments.length = 0;
    },
  };
  return sink;
}

export interface SeedOptions {
  today: DateStr;
  nowMs: number;
  log?: (msg: string) => void;
}

/** Build the whole demo world into an empty database. */
export async function seedAll(q: Queryable, { today, nowMs, log = () => {} }: SeedOptions) {
  const { scale, horizonDays, pastDays, rngSeed } = seedConfig;
  const t0 = performance.now();
  const lap = (m: string) => log(`${m} (${((performance.now() - t0) / 1000).toFixed(1)}s)`);

  await insertReferenceData(q);
  const from = addDays(today, -pastDays);
  const horizonEnd = addDays(today, horizonDays);
  const schedulesUntil = addDays(today, SCHEDULE_LOOKAHEAD_DAYS);
  const schedules = generateSchedules(offsetPeriods(from, schedulesUntil), scale);
  await insertSchedules(q, schedules, 1);
  lap(`reference data + ${schedules.length} schedules`);

  const instances = materializeFlights(schedules, from, horizonEnd, 1);
  await insertFlights(q, instances, (i) => i + 1);
  lap(`${instances.length} flights ${from} → ${horizonEnd}`);

  const legs: FlightLeg[] = instances.map((f) => ({
    id: f.id,
    flightNumber: f.flightNumber,
    routeId: f.routeId,
    origin: f.origin,
    dest: f.dest,
    aircraft: f.aircraft,
    depLocalDate: f.depLocalDate,
    depUtc: f.depUtc,
    arrUtc: f.arrUtc,
    distanceKm: ROUTE_BY_ID.get(f.routeId)!.distanceKm,
    inv: Object.fromEntries(f.cabins.map((c) => [c.cabin, { capacity: c.capacity, sold: 0 }])),
  }));
  const sims = withTargets(legs, today);
  const { bookings } = await generateTraffic(sims, {
    rng: mulberry32(rngSeed),
    today,
    nowMs,
    firstBookingId: 1,
    existingPnrs: new Set(),
    bookedAt: seedBookedAt(today),
    sink: copySink(q),
  });
  lap(`${bookings} simulated bookings`);

  await copyRows(
    q,
    "flight_cabin_inventory",
    ["flight_id", "cabin", "capacity", "sold"],
    (function* () {
      for (const s of sims) for (const [c, v] of Object.entries(s.inv)) yield [s.id, c, v!.capacity, v!.sold];
    })(),
  );
  await resetSequences(q);
  await q.query("ANALYZE");
  await q.query("CHECKPOINT").catch(() => {}); // not permitted on managed Postgres
  await writeState(q, {
    rng_seed: rngSeed,
    scale,
    anchor_date: today,
    horizon_end: horizonEnd,
    schedules_until: schedulesUntil,
    last_tick_date: today,
    last_tick_at: nowMs,
  });
  lap("inventory + indexes analyzed");
  return { flights: instances.length, bookings };
}
