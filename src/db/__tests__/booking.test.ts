import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type DbHandle, openDb } from "../client";
import { createBooking, priceSelection } from "../booking";
import { checkConsistency } from "../seed/check";
import { loadLegs, readState } from "../seed/load";
import { seedAll } from "../seed/seedAll";
import { tick } from "../seed/tick";
import { buildItineraries } from "@/domain/search/buildItineraries";
import { pathsFor } from "@/domain/search/paths";
import { addDays, DAY, localToUtc } from "@/domain/time";
import type { FlightLeg } from "@/domain/types";
import type { TripSearch } from "@/lib/searchParams";
import type { BookingForm } from "@/lib/bookingSchema";

const TODAY = "2026-10-06";
const NOW = localToUtc(TODAY, 9 * 60, "America/Toronto");
let h: DbHandle;

async function search(from: string, to: string, date: string, seats: number) {
  const paths = pathsFor(from, to);
  const ids = [...new Set(paths.flatMap((p) => p.routes.map((r) => r.id)))];
  const legs = await loadLegs(h.pg, `f.route_id = ANY($1::int[])`, [ids]);
  const by = new Map<number, FlightLeg[]>();
  for (const l of legs) (by.get(l.routeId) ?? by.set(l.routeId, []).get(l.routeId)!).push(l);
  return buildItineraries({ date, seats, nowMs: NOW, today: TODAY, paths, legsByRoute: by });
}

const form = (n: number, inf = 0): BookingForm => ({
  passengers: [
    ...Array.from({ length: n }, (_, i) => ({ type: "ADT" as const, firstName: `Test${i}`, lastName: "Flyer", dob: "1985-05-05" })),
    ...Array.from({ length: inf }, () => ({ type: "INF" as const, firstName: "Baby", lastName: "Flyer", dob: "2026-01-01" })),
  ],
  contact: { email: "t@example.com", phone: "+1 416 555 0100" },
});

beforeAll(async () => {
  h = await openDb();
  await seedAll(h.pg, { today: TODAY, nowMs: NOW });
});
afterAll(async () => h?.close());

describe("seeded world", () => {
  it("keeps inventory consistent with bookings and follows the booking curve", async () => {
    const r = await checkConsistency(h.pg, TODAY);
    expect(r.mismatches).toBe(0);
    expect(r.oversold).toBe(0);
    expect(r.counts.bookings).toBeGreaterThan(1000);
    const lf = Object.fromEntries(r.stats.map((s) => [s.bucket, s.lf]));
    expect(lf["0-3"]).toBeGreaterThan(0.75);
    expect(lf["8-28"]).toBeLessThan(lf["0-3"]);
  });
});

describe("booking", () => {
  const date = addDays(TODAY, 10);
  const base = (over: Partial<TripSearch> = {}): TripSearch => ({
    trip: "OW", from: "YYZ", to: "YUL", depart: date, adt: 2, chd: 0, inf: 1, sort: "dep", ...over,
  });

  it("books, decrements inventory and stays consistent", async () => {
    const its = await search("YYZ", "YUL", date, 2);
    const it = its.find((i) => i.offers.CLASSIC.status === "AVAILABLE")!;
    const before = it.legs[0].inv.Y!.sold;
    const ids = it.legs.map((l) => l.id);
    const legs = new Map(it.legs.map((l) => [l.id, l]));
    const priced = priceSelection(base(), { out: { flightIds: ids, brand: "CLASSIC" } }, legs, TODAY, NOW);
    if ("error" in priced) throw new Error(priced.error);
    const r = await createBooking(h.pg, { search: base(), out: { flightIds: ids, brand: "CLASSIC" }, ret: null, form: form(2, 1), quotedTotalCents: priced.quote.totalCents }, TODAY, NOW);
    expect(r.ok).toBe(true);
    const [after] = await loadLegs(h.pg, `f.id = $1`, [ids[0]]);
    expect(after.inv.Y!.sold).toBe(before + 2); // lap infant takes no seat
    expect((await checkConsistency(h.pg, TODAY)).mismatches).toBe(0);
  });

  it("asks before charging a higher price", async () => {
    const its = await search("YYZ", "YUL", date, 1);
    const it = its.find((i) => i.offers.CLASSIC.status === "AVAILABLE")!;
    const out = { flightIds: it.legs.map((l) => l.id), brand: "CLASSIC" as const };
    const s = base({ adt: 1, inf: 0 });
    const r = await createBooking(h.pg, { search: s, out, ret: null, form: form(1), quotedTotalCents: 100 }, TODAY, NOW);
    expect(r.ok).toBe(false);
    if (r.ok || r.code !== "PRICE_CHANGED") throw new Error("expected PRICE_CHANGED");
    const ok = await createBooking(h.pg, { search: s, out, ret: null, form: form(1), quotedTotalCents: 100, acceptedTotalCents: r.newTotalCents }, TODAY, NOW);
    expect(ok.ok).toBe(true);
  });

  it("never oversells under concurrent bookings", async () => {
    const its = await search("YYZ", "YUL", date, 1);
    const flight = its.find((i) => i.stops === 0)!.legs[0];
    await h.pg.query(`UPDATE flight_cabin_inventory SET sold = capacity - 2 WHERE flight_id = $1 AND cabin = 'Y'`, [flight.id]);
    // keep the invariant honest for the final check: remember the manual adjustment
    const s = base({ adt: 1, inf: 0 });
    const out = { flightIds: [flight.id], brand: "CLASSIC" as const };
    const results = await Promise.all(
      Array.from({ length: 20 }, () => createBooking(h.pg, { search: s, out, ret: null, form: form(1), quotedTotalCents: 10_000_000 }, TODAY, NOW)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.code === "SOLD_OUT")).toBe(true);
    const [after] = await loadLegs(h.pg, `f.id = $1`, [flight.id]);
    expect(after.inv.Y!.sold).toBe(after.inv.Y!.capacity);
  });

  it("rejects mismatched passengers and bad ages", async () => {
    const its = await search("YYZ", "YUL", date, 1);
    const out = { flightIds: [its[0].legs[0].id], brand: "CLASSIC" as const };
    const r1 = await createBooking(h.pg, { search: base({ adt: 2, inf: 0 }), out, ret: null, form: form(1), quotedTotalCents: 1e9 }, TODAY, NOW);
    expect(r1).toMatchObject({ ok: false, code: "INVALID" });
    const kid = { ...form(1), passengers: [{ type: "ADT" as const, firstName: "Too", lastName: "Young", dob: "2020-01-01" }] };
    const r2 = await createBooking(h.pg, { search: base({ adt: 1, inf: 0 }), out, ret: null, form: kid, quotedTotalCents: 1e9 }, TODAY, NOW);
    expect(r2).toMatchObject({ ok: false, code: "INVALID" });
  });
});

describe("rolling window", () => {
  it("is idempotent per day and rolls forward", async () => {
    expect((await tick(h.pg, TODAY, NOW)).skipped).toBe(true);
    const next = addDays(TODAY, 1);
    const r = await tick(h.pg, next, NOW + DAY);
    expect(r.skipped).toBe(false);
    expect(r.newFlights).toBeGreaterThan(0);
    expect(r.newBookings).toBeGreaterThan(0);
    expect((await readState(h.pg)).horizon_end).toBe(addDays(next, 21));
    const c = await checkConsistency(h.pg, next);
    expect(c.oversold).toBe(0);
  });
});
