import type { Queryable } from "./load";

/** Empty every table (used to reseed in-process while the app holds the PGlite lock). */
export async function truncateAll(q: Queryable) {
  await q.query(
    `TRUNCATE booking_segments, passengers, bookings, flight_cabin_inventory, flights, flight_schedules,
              fare_buckets, fare_brands, routes, aircraft_cabins, aircraft_types, airports, seed_state
       RESTART IDENTITY CASCADE`,
  );
}
