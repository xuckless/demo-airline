import { AIRPORTS } from "@/config/airports";
import { FARE_BRANDS, FARE_BUCKETS } from "@/config/fares";
import { FLEET } from "@/config/fleet";
import { ROUTES } from "@/domain/network";
import type { Schedule } from "@/domain/schedule/generateSchedules";
import type { FlightInstance } from "@/domain/schedule/materializeFlights";
import { hhmm } from "@/domain/time";
import { copyRows } from "../bulk";
import type { Queryable } from "./load";

export async function insertReferenceData(q: Queryable) {
  await copyRows(
    q,
    "airports",
    ["iata", "name", "city", "region", "country", "province", "tz", "lat", "lon", "is_hub", "aif_cents"],
    AIRPORTS.map((a) => [a.iata, a.name, a.city, a.region, a.country, a.province, a.tz, a.lat, a.lon, a.isHub, a.aifCents]),
  );
  await copyRows(q, "aircraft_types", ["code", "name", "short_name", "cruise_kmh"], FLEET.map((f) => [f.code, f.name, f.shortName, f.cruiseKmh]));
  await copyRows(
    q,
    "aircraft_cabins",
    ["aircraft_code", "cabin", "seats", "product", "pitch_in"],
    FLEET.flatMap((f) => f.cabins.map((c) => [f.code, c.cabin, c.seats, c.product, c.pitchIn])),
  );
  await copyRows(
    q,
    "routes",
    ["id", "origin", "dest", "distance_km", "market", "kind"],
    ROUTES.map((r) => [r.id, r.origin, r.dest, r.distanceKm, r.market, r.kind]),
  );
  for (const b of FARE_BRANDS) {
    await q.query(
      `INSERT INTO fare_brands (code, name, cabin, display_order, tagline, bags_included, seat_selection, change_fee_cents, refundable, fallback_brand, perks)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [b.code, b.name, b.cabin, b.displayOrder, b.tagline, b.bagsIncluded, b.seatSelection, b.changeFeeCents, b.refundable, b.fallback, JSON.stringify(b.perks)],
    );
  }
  await copyRows(
    q,
    "fare_buckets",
    ["brand_code", "rbd", "step", "lf_max", "min_adv_days", "multiplier"],
    FARE_BUCKETS.map((b) => [b.brand, b.rbd, b.step, b.lfMax, b.minAdvDays, b.multiplier]),
  );
}

export async function insertSchedules(q: Queryable, schedules: Schedule[], firstId: number) {
  await copyRows(
    q,
    "flight_schedules",
    ["id", "flight_number", "route_id", "aircraft_code", "dep_local_time", "block_min", "dow_mask", "effective_from", "effective_to", "bank_tag"],
    schedules.map((s, i) => [firstId + i, s.flightNumber, s.routeId, s.aircraft, hhmm(s.depLocalMin), s.blockMin, s.dowMask, s.effectiveFrom, s.effectiveTo, s.bankTag]),
  );
}

export async function insertFlights(q: Queryable, flights: FlightInstance[], scheduleIdOf: (idx: number) => number) {
  await copyRows(
    q,
    "flights",
    ["id", "schedule_id", "flight_number", "route_id", "origin", "dest", "aircraft_code", "dep_local_date", "dep_utc", "arr_utc", "block_min"],
    flights.map((f) => [
      f.id,
      scheduleIdOf(f.scheduleIndex),
      f.flightNumber,
      f.routeId,
      f.origin,
      f.dest,
      f.aircraft,
      f.depLocalDate,
      new Date(f.depUtc),
      new Date(f.arrUtc),
      f.blockMin,
    ]),
  );
}

export async function resetSequences(q: Queryable) {
  for (const t of ["flight_schedules", "flights", "fare_buckets", "bookings", "passengers", "booking_segments"]) {
    await q.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT max(id) FROM ${t}), 0) + 1, false)`);
  }
}
