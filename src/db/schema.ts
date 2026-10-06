import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const cabinEnum = pgEnum("cabin", ["Y", "W", "J"]);
export const regionEnum = pgEnum("region", ["CA", "US", "SUN"]);
export const marketEnum = pgEnum("market", ["DOM", "TB", "INT"]);
export const routeKindEnum = pgEnum("route_kind", ["TRUNK", "SPOKE"]);
export const brandEnum = pgEnum("fare_brand", ["BASIC", "CLASSIC", "PREMIUM", "BUSINESS"]);
export const flightStatusEnum = pgEnum("flight_status", ["SCHEDULED", "CANCELLED"]);
export const bookingStatusEnum = pgEnum("booking_status", ["CONFIRMED", "CANCELLED"]);
export const tripTypeEnum = pgEnum("trip_type", ["OW", "RT"]);
export const bookingSourceEnum = pgEnum("booking_source", ["WEB", "SEED"]);
export const paxTypeEnum = pgEnum("pax_type", ["ADT", "CHD", "INF"]);
export const directionEnum = pgEnum("direction", ["OUT", "RET"]);

const tsUtc = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const airports = pgTable("airports", {
  iata: char("iata", { length: 3 }).primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  region: regionEnum("region").notNull(),
  country: char("country", { length: 2 }).notNull(),
  province: text("province"),
  tz: text("tz").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  isHub: boolean("is_hub").notNull().default(false),
  aifCents: integer("aif_cents").notNull().default(0),
});

export const aircraftTypes = pgTable("aircraft_types", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  cruiseKmh: integer("cruise_kmh").notNull(),
});

export const aircraftCabins = pgTable(
  "aircraft_cabins",
  {
    aircraftCode: text("aircraft_code")
      .notNull()
      .references(() => aircraftTypes.code),
    cabin: cabinEnum("cabin").notNull(),
    seats: smallint("seats").notNull(),
    product: text("product").notNull(),
    pitchIn: smallint("pitch_in").notNull(),
  },
  (t) => [primaryKey({ columns: [t.aircraftCode, t.cabin] })],
);

export const routes = pgTable(
  "routes",
  {
    id: integer("id").primaryKey(),
    origin: char("origin", { length: 3 })
      .notNull()
      .references(() => airports.iata),
    dest: char("dest", { length: 3 })
      .notNull()
      .references(() => airports.iata),
    distanceKm: integer("distance_km").notNull(),
    market: marketEnum("market").notNull(),
    kind: routeKindEnum("kind").notNull(),
  },
  (t) => [unique().on(t.origin, t.dest)],
);

export const flightSchedules = pgTable(
  "flight_schedules",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    flightNumber: integer("flight_number").notNull(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id),
    aircraftCode: text("aircraft_code")
      .notNull()
      .references(() => aircraftTypes.code),
    depLocalTime: text("dep_local_time").notNull(), // "HH:MM"
    blockMin: smallint("block_min").notNull(),
    dowMask: smallint("dow_mask").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }).notNull(),
    bankTag: text("bank_tag"),
  },
  (t) => [unique().on(t.flightNumber, t.effectiveFrom)],
);

export const flights = pgTable(
  "flights",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    scheduleId: integer("schedule_id")
      .notNull()
      .references(() => flightSchedules.id),
    flightNumber: integer("flight_number").notNull(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id),
    origin: char("origin", { length: 3 }).notNull(),
    dest: char("dest", { length: 3 }).notNull(),
    aircraftCode: text("aircraft_code").notNull(),
    depLocalDate: date("dep_local_date", { mode: "string" }).notNull(),
    depUtc: tsUtc("dep_utc").notNull(),
    arrUtc: tsUtc("arr_utc").notNull(),
    blockMin: smallint("block_min").notNull(),
    status: flightStatusEnum("status").notNull().default("SCHEDULED"),
  },
  (t) => [
    unique().on(t.flightNumber, t.depLocalDate),
    index("flights_route_dep_idx").on(t.routeId, t.depUtc),
    index("flights_origin_date_idx").on(t.origin, t.depLocalDate),
    index("flights_dep_idx").on(t.depUtc),
  ],
);

export const flightCabinInventory = pgTable(
  "flight_cabin_inventory",
  {
    flightId: integer("flight_id")
      .notNull()
      .references(() => flights.id, { onDelete: "cascade" }),
    cabin: cabinEnum("cabin").notNull(),
    capacity: smallint("capacity").notNull(),
    sold: smallint("sold").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.flightId, t.cabin] }),
    check("inventory_sold_range", sql`${t.sold} >= 0 AND ${t.sold} <= ${t.capacity}`),
  ],
);

export const fareBrands = pgTable("fare_brands", {
  code: brandEnum("code").primaryKey(),
  name: text("name").notNull(),
  cabin: cabinEnum("cabin").notNull(),
  displayOrder: smallint("display_order").notNull(),
  tagline: text("tagline").notNull(),
  bagsIncluded: smallint("bags_included").notNull(),
  seatSelection: text("seat_selection").notNull(),
  changeFeeCents: integer("change_fee_cents"),
  refundable: boolean("refundable").notNull(),
  fallbackBrand: brandEnum("fallback_brand"),
  perks: jsonb("perks").$type<{ label: string; included: boolean }[]>().notNull(),
});

export const fareBuckets = pgTable(
  "fare_buckets",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    brandCode: brandEnum("brand_code")
      .notNull()
      .references(() => fareBrands.code),
    rbd: char("rbd", { length: 1 }).notNull(),
    step: smallint("step").notNull(),
    lfMax: numeric("lf_max", { precision: 4, scale: 3, mode: "number" }).notNull(),
    minAdvDays: smallint("min_adv_days").notNull(),
    multiplier: numeric("multiplier", { precision: 5, scale: 3, mode: "number" }).notNull(),
  },
  (t) => [unique().on(t.brandCode, t.rbd)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    pnr: char("pnr", { length: 6 }).notNull().unique(),
    status: bookingStatusEnum("status").notNull().default("CONFIRMED"),
    tripType: tripTypeEnum("trip_type").notNull(),
    origin: char("origin", { length: 3 }).notNull(),
    destination: char("destination", { length: 3 }).notNull(),
    adults: smallint("adults").notNull(),
    children: smallint("children").notNull(),
    infants: smallint("infants").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("CAD"),
    baseCents: integer("base_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    source: bookingSourceEnum("source").notNull(),
    bookedAt: tsUtc("booked_at").notNull(),
  },
  (t) => [index("bookings_booked_at_idx").on(t.bookedAt), index("bookings_source_idx").on(t.source)],
);

export const passengers = pgTable(
  "passengers",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    seq: smallint("seq").notNull(),
    type: paxTypeEnum("type").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dob: date("dob", { mode: "string" }).notNull(),
    infantOfSeq: smallint("infant_of_seq"),
  },
  (t) => [index("passengers_booking_idx").on(t.bookingId), index("passengers_last_name_idx").on(t.lastName)],
);

export const bookingSegments = pgTable(
  "booking_segments",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    direction: directionEnum("direction").notNull(),
    seq: smallint("seq").notNull(),
    flightId: integer("flight_id")
      .notNull()
      .references(() => flights.id),
    cabin: cabinEnum("cabin").notNull(),
    brandCode: brandEnum("brand_code").notNull(),
    rbd: char("rbd", { length: 1 }).notNull(),
    seats: smallint("seats").notNull(),
    fareCents: integer("fare_cents").notNull(),
  },
  (t) => [unique().on(t.bookingId, t.direction, t.seq), index("booking_segments_flight_idx").on(t.flightId)],
);

export const seedState = pgTable("seed_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
