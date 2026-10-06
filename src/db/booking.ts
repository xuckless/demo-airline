import { loadLegs } from "./seed/load";
import { makePnr } from "@/domain/booking/pnr";
import { priceBrand } from "@/domain/pricing/offer";
import { quoteTrip, type TripQuote } from "@/domain/pricing/quote";
import { validateItinerary } from "@/domain/search/validate";
import { HOUR } from "@/domain/time";
import type { BrandOffer, FlightLeg, Pax } from "@/domain/types";
import { ageError, type BookingForm } from "@/lib/bookingSchema";
import type { Selection, TripSearch } from "@/lib/searchParams";
import type { SqlDb } from "./sql";

export type BookingResult =
  | { ok: true; pnr: string }
  | { ok: false; code: "SOLD_OUT" | "INVALID"; message: string }
  | { ok: false; code: "PRICE_CHANGED"; message: string; oldTotalCents: number; newTotalCents: number };

class SoldOut extends Error {}

export interface PricedTrip {
  directions: { dir: "OUT" | "RET"; legs: FlightLeg[]; offer: BrandOffer }[];
  quote: TripQuote;
}

/** Validate & price a selection against live inventory. Returns an error message or the priced trip. */
export function priceSelection(
  search: TripSearch,
  sel: { out: Selection; ret?: Selection | null },
  legsById: Map<number, FlightLeg>,
  t: string,
  now: number,
): PricedTrip | { error: string; soldOut?: boolean } {
  const pax: Pax = { adults: search.adt, children: search.chd, infants: search.inf };
  const seats = pax.adults + pax.children;
  const dirs: PricedTrip["directions"] = [];
  const plan: ["OUT" | "RET", Selection, string, string, string][] = [["OUT", sel.out, search.from, search.to, search.depart]];
  if (search.trip === "RT") {
    if (!sel.ret || !search.return) return { error: "Choose a return flight." };
    plan.push(["RET", sel.ret, search.to, search.from, search.return]);
  }
  for (const [dir, s, from, to, date] of plan) {
    const legs = s.flightIds.map((id) => legsById.get(id));
    if (legs.some((l) => !l)) return { error: "One of the selected flights no longer exists." };
    const ls = legs as FlightLeg[];
    const minDepUtc = dir === "RET" ? dirs[0].legs[dirs[0].legs.length - 1].arrUtc + 2 * HOUR : undefined;
    const err = validateItinerary(ls, { from, to, date, nowMs: now, minDepUtc });
    if (err) return { error: err };
    const offer = priceBrand(ls, s.brand, seats, t);
    if (offer.status !== "AVAILABLE") return { error: "Sorry — that fare just sold out. Please choose another flight or fare.", soldOut: true };
    dirs.push({ dir, legs: ls, offer });
  }
  return { directions: dirs, quote: quoteTrip(dirs, pax) };
}

export interface CreateBookingInput {
  search: TripSearch;
  out: Selection;
  ret: Selection | null;
  form: BookingForm;
  quotedTotalCents: number;
  acceptedTotalCents?: number;
}

export async function createBooking(pg: SqlDb, input: CreateBookingInput, t: string, now: number): Promise<BookingResult> {
  const { search, form } = input;

  // Passenger list must match the searched party.
  const count = (ty: string) => form.passengers.filter((p) => p.type === ty).length;
  if (count("ADT") !== search.adt || count("CHD") !== search.chd || count("INF") !== search.inf) {
    return { ok: false, code: "INVALID", message: "Passenger details don't match the number of travellers." };
  }
  const lastTravel = search.trip === "RT" && search.return ? search.return : search.depart;
  for (const p of form.passengers) {
    const e = ageError(p.type, p.dob, search.depart, lastTravel, t);
    if (e) return { ok: false, code: "INVALID", message: `${p.firstName} ${p.lastName}: ${e}` };
  }

  const ids = [...input.out.flightIds, ...(input.ret?.flightIds ?? [])];
  try {
    return await pg.transaction(async (tx): Promise<BookingResult> => {
      // Lock the inventory rows (a no-op under PGlite's exclusive transactions, real locks on Postgres).
      await tx.query(`SELECT flight_id FROM flight_cabin_inventory WHERE flight_id = ANY($1::int[]) FOR UPDATE`, [ids]);
      const legs = await loadLegs(tx, `f.id = ANY($1::int[])`, [ids]);
      const priced = priceSelection(search, input, new Map(legs.map((l) => [l.id, l])), t, now);
      if ("error" in priced) return { ok: false, code: priced.soldOut ? "SOLD_OUT" : "INVALID", message: priced.error };

      const total = priced.quote.totalCents;
      if (total > input.quotedTotalCents && input.acceptedTotalCents !== total) {
        return {
          ok: false,
          code: "PRICE_CHANGED",
          message: "The fare changed while you were booking.",
          oldTotalCents: input.quotedTotalCents,
          newTotalCents: total,
        };
      }

      const seats = search.adt + search.chd;
      for (const d of priced.directions) {
        for (const s of d.offer.segments) {
          const r = await tx.query(
            `UPDATE flight_cabin_inventory SET sold = sold + $3
              WHERE flight_id = $1 AND cabin = $2 AND capacity - sold >= $3 RETURNING sold`,
            [s.flightId, s.cabin, seats],
          );
          if (!r.rows.length) throw new SoldOut();
        }
      }

      let pnr = makePnr();
      for (let i = 0; i < 10; i++) {
        const hit = await tx.query(`SELECT 1 FROM bookings WHERE pnr = $1`, [pnr]);
        if (!hit.rows.length) break;
        pnr = makePnr();
      }
      const q = priced.quote;
      const b = await tx.query<{ id: number }>(
        `INSERT INTO bookings (pnr, status, trip_type, origin, destination, adults, children, infants,
                               contact_email, contact_phone, currency, base_cents, tax_cents, total_cents, source, booked_at)
         VALUES ($1, 'CONFIRMED', $2, $3, $4, $5, $6, $7, $8, $9, 'CAD', $10, $11, $12, 'WEB', $13) RETURNING id`,
        [pnr, search.trip, search.from, search.to, search.adt, search.chd, search.inf, form.contact.email, form.contact.phone,
          q.baseCents, q.taxCents, q.totalCents, new Date(now).toISOString()],
      );
      const bookingId = b.rows[0].id;
      // Infants are attached to adults in order.
      let infantIdx = 0;
      const adultSeqs: number[] = [];
      for (const [i, p] of form.passengers.entries()) {
        if (p.type === "ADT") adultSeqs.push(i + 1);
      }
      for (const [i, p] of form.passengers.entries()) {
        const infantOf = p.type === "INF" ? adultSeqs[infantIdx++] : null;
        await tx.query(
          `INSERT INTO passengers (booking_id, seq, type, first_name, last_name, dob, infant_of_seq) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [bookingId, i + 1, p.type, p.firstName.trim(), p.lastName.trim(), p.dob, infantOf],
        );
      }
      for (const d of priced.directions) {
        for (const [i, s] of d.offer.segments.entries()) {
          await tx.query(
            `INSERT INTO booking_segments (booking_id, direction, seq, flight_id, cabin, brand_code, rbd, seats, fare_cents)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [bookingId, d.dir, i + 1, s.flightId, s.cabin, s.brand, s.rbd, seats, s.fareCents],
          );
        }
      }
      return { ok: true, pnr };
    });
  } catch (e) {
    if (e instanceof SoldOut) return { ok: false, code: "SOLD_OUT", message: "Sorry — seats on one of your flights just sold out." };
    throw e;
  }
}
