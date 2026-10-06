import "server-only";
import type { BrandCode } from "@/config/fares";
import type { Cabin } from "@/config/fleet";
import { isPnr } from "@/domain/booking/pnr";
import { appDb } from "./db";

export interface BookingView {
  pnr: string;
  status: string;
  tripType: "OW" | "RT";
  origin: string;
  destination: string;
  adults: number;
  children: number;
  infants: number;
  contactEmail: string;
  contactPhone: string;
  baseCents: number;
  taxCents: number;
  totalCents: number;
  source: "WEB" | "SEED";
  bookedAt: Date;
  passengers: { seq: number; type: "ADT" | "CHD" | "INF"; firstName: string; lastName: string; dob: string }[];
  segments: {
    direction: "OUT" | "RET";
    seq: number;
    flightNumber: number;
    origin: string;
    dest: string;
    aircraft: string;
    depUtc: number;
    arrUtc: number;
    depLocalDate: string;
    cabin: Cabin;
    brand: BrandCode;
    rbd: string;
  }[];
}

export async function getBooking(pnr: string): Promise<BookingView | null> {
  const code = pnr.toUpperCase();
  if (!isPnr(code)) return null;
  const { pg } = await appDb();
  const b = await pg.query<{
    id: number; pnr: string; status: string; trip_type: "OW" | "RT"; origin: string; destination: string;
    adults: number; children: number; infants: number; contact_email: string; contact_phone: string;
    base_cents: number; tax_cents: number; total_cents: number; source: "WEB" | "SEED"; booked_at: Date;
  }>(`SELECT * FROM bookings WHERE pnr = $1`, [code]);
  const row = b.rows[0];
  if (!row) return null;
  const pax = await pg.query<{ seq: number; type: "ADT" | "CHD" | "INF"; first_name: string; last_name: string; dob: string }>(
    `SELECT seq, type, first_name, last_name, dob::text FROM passengers WHERE booking_id = $1 ORDER BY seq`,
    [row.id],
  );
  const segs = await pg.query<{
    direction: "OUT" | "RET"; seq: number; flight_number: number; origin: string; dest: string; aircraft_code: string;
    dep_ms: number; arr_ms: number; dep_local_date: string; cabin: Cabin; brand_code: BrandCode; rbd: string;
  }>(
    `SELECT s.direction, s.seq, f.flight_number, f.origin, f.dest, f.aircraft_code,
            (extract(epoch FROM f.dep_utc) * 1000)::float8 AS dep_ms, (extract(epoch FROM f.arr_utc) * 1000)::float8 AS arr_ms,
            f.dep_local_date::text, s.cabin, s.brand_code, s.rbd
       FROM booking_segments s JOIN flights f ON f.id = s.flight_id
      WHERE s.booking_id = $1 ORDER BY s.direction DESC, s.seq`,
    [row.id],
  );
  return {
    pnr: row.pnr,
    status: row.status,
    tripType: row.trip_type,
    origin: row.origin,
    destination: row.destination,
    adults: row.adults,
    children: row.children,
    infants: row.infants,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    baseCents: row.base_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    source: row.source,
    bookedAt: row.booked_at,
    passengers: pax.rows.map((p) => ({ seq: p.seq, type: p.type, firstName: p.first_name, lastName: p.last_name, dob: p.dob })),
    segments: segs.rows
      .map((s) => ({
        direction: s.direction,
        seq: s.seq,
        flightNumber: s.flight_number,
        origin: s.origin,
        dest: s.dest,
        aircraft: s.aircraft_code,
        depUtc: s.dep_ms,
        arrUtc: s.arr_ms,
        depLocalDate: s.dep_local_date,
        cabin: s.cabin,
        brand: s.brand_code,
        rbd: s.rbd,
      }))
      .sort((a, b) => (a.direction === b.direction ? a.seq - b.seq : a.direction === "OUT" ? -1 : 1)),
  };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/gi, "").toLowerCase();

/** Manage-booking lookup: record locator + any passenger's last name. */
export async function findBooking(pnr: string, lastName: string): Promise<BookingView | null> {
  const b = await getBooking(pnr.trim());
  if (!b) return null;
  const ln = norm(lastName);
  return b.passengers.some((p) => norm(p.lastName) === ln) ? b : null;
}
