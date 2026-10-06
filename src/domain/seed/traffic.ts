import { airport, HUBS } from "@/config/airports";
import { brand as brandConfig } from "@/config/brand";
import { BRAND_BY_CODE, type BrandCode } from "@/config/fares";
import type { Cabin } from "@/config/fleet";
import { makePnr } from "../booking/pnr";
import { ROUTE_BY_ID, routeFor } from "../network";
import { priceBrand } from "../pricing/offer";
import { quoteTrip } from "../pricing/quote";
import { pick, randInt, type Rng, shuffle, weighted } from "../rng";
import { minConnectMinutes, MAX_CONNECTION_MIN } from "../search/connections";
import { pathsFor } from "../search/paths";
import { addDays, DAY, type DateStr, diffDays, HOUR, localDate, MINUTE } from "../time";
import type { BrandOffer, FlightLeg, Pax } from "../types";
import { bookedShare, finalLoadFactor, sampleLeadDays, targetSold } from "./curve";
import { AREA_CODES, FIRST_NAMES, LAST_NAMES } from "./names";

export interface SimFlight extends FlightLeg {
  target: Partial<Record<Cabin, number>>;
  finalLf: Partial<Record<Cabin, number>>;
}

export const BOOKING_COLUMNS = [
  "id", "pnr", "status", "trip_type", "origin", "destination", "adults", "children", "infants",
  "contact_email", "contact_phone", "currency", "base_cents", "tax_cents", "total_cents", "source", "booked_at",
];
export const PASSENGER_COLUMNS = ["booking_id", "seq", "type", "first_name", "last_name", "dob", "infant_of_seq"];
export const SEGMENT_COLUMNS = ["booking_id", "direction", "seq", "flight_id", "cabin", "brand_code", "rbd", "seats", "fare_cents"];

type Row = (string | number | null | Date)[];

export interface TrafficSink {
  bookings: Row[];
  passengers: Row[];
  segments: Row[];
  flush: () => Promise<void>;
}

export interface TrafficOptions {
  rng: Rng;
  today: DateStr;
  nowMs: number;
  firstBookingId: number;
  existingPnrs: Set<string>;
  /** When the booking was made, given its first leg. */
  bookedAt: (first: SimFlight, rng: Rng) => number;
  sink: TrafficSink;
  flushEvery?: number;
}

/** Attach final load factors and today's sold targets to flights. */
export function withTargets(legs: FlightLeg[], today: DateStr): SimFlight[] {
  return legs.map((l) => {
    const r = ROUTE_BY_ID.get(l.routeId)!;
    const target: SimFlight["target"] = {};
    const finalLf: SimFlight["finalLf"] = {};
    const daysOut = diffDays(l.depLocalDate, today);
    for (const [cabin, inv] of Object.entries(l.inv) as [Cabin, { capacity: number; sold: number }][]) {
      const lf = finalLoadFactor(l.flightNumber, l.depLocalDate, `${r.origin}${r.dest}`, r.dest, cabin);
      finalLf[cabin] = lf;
      target[cabin] = Math.max(inv.sold, targetSold(inv.capacity, lf, daysOut));
    }
    return { ...l, target, finalLf };
  });
}

const isHub = (c: string) => HUBS.includes(c);

function lowerBound<T>(xs: T[], key: (x: T) => number, v: number) {
  let lo = 0, hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(xs[mid]) < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function cabinFor(leg: FlightLeg, brand: BrandCode): Cabin | null {
  let code: BrandCode | null = brand;
  while (code && !leg.inv[BRAND_BY_CODE.get(code)!.cabin]) code = BRAND_BY_CODE.get(code)!.fallback;
  return code ? BRAND_BY_CODE.get(code)!.cabin : null;
}

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();

/**
 * Simulated demand: fills each flight-cabin up to its target with real
 * bookings (locals, hub connections, round trips), priced as RM would have
 * priced them when booked. Inventory `sold` is mutated in place.
 */
export async function generateTraffic(flights: SimFlight[], opts: TrafficOptions) {
  const { rng, sink } = opts;
  const flushEvery = opts.flushEvery ?? 50_000;
  const byRouteDate = new Map<string, SimFlight[]>();
  const deps = new Map<string, SimFlight[]>();
  const arrs = new Map<string, SimFlight[]>();
  for (const f of flights) {
    const k = `${f.routeId}|${f.depLocalDate}`;
    (byRouteDate.get(k) ?? byRouteDate.set(k, []).get(k)!).push(f);
    (deps.get(f.origin) ?? deps.set(f.origin, []).get(f.origin)!).push(f);
    (arrs.get(f.dest) ?? arrs.set(f.dest, []).get(f.dest)!).push(f);
  }
  for (const xs of deps.values()) xs.sort((a, b) => a.depUtc - b.depUtc);
  for (const xs of arrs.values()) xs.sort((a, b) => a.arrUtc - b.arrUtc);

  const validRouting = new Map<string, boolean>();
  const isValid = (legs: FlightLeg[]) => {
    const key = legs.map((l) => l.routeId).join(",");
    let v = validRouting.get(key);
    if (v === undefined) {
      const o = legs[0].origin;
      const d = legs[legs.length - 1].dest;
      v = o !== d && pathsFor(o, d).some((p) => p.routes.length === legs.length && p.routes.every((r, i) => r.id === legs[i].routeId));
      validRouting.set(key, v);
    }
    return v;
  };

  const canTake = (f: SimFlight, cabin: Cabin | null, seats: number) =>
    cabin !== null && f.inv[cabin] !== undefined && f.inv[cabin]!.sold + seats <= (f.target[cabin] ?? 0);

  const onward = (f: SimFlight) => {
    if (!isHub(f.dest)) return [];
    const xs = deps.get(f.dest) ?? [];
    const out: SimFlight[] = [];
    for (let i = lowerBound(xs, (x) => x.depUtc, f.arrUtc + 45 * MINUTE); i < xs.length; i++) {
      const n = xs[i];
      const gap = (n.depUtc - f.arrUtc) / MINUTE;
      if (gap > MAX_CONNECTION_MIN) break;
      if (n.dest !== f.origin && gap >= minConnectMinutes(f, n)) out.push(n);
    }
    return out;
  };
  const feeders = (f: SimFlight) => {
    if (!isHub(f.origin)) return [];
    const xs = arrs.get(f.origin) ?? [];
    const out: SimFlight[] = [];
    for (let i = lowerBound(xs, (x) => x.arrUtc, f.depUtc - MAX_CONNECTION_MIN * MINUTE); i < xs.length; i++) {
      const p = xs[i];
      const gap = (f.depUtc - p.arrUtc) / MINUTE;
      if (gap < 45) break;
      if (p.origin !== f.dest && gap >= minConnectMinutes(p, f)) out.push(p);
    }
    return out;
  };

  /** Same rule as search: the brand's cabin must exist on the longest leg. */
  const offerable = (legs: FlightLeg[], brand: BrandCode) => {
    const longest = legs.reduce((a, b) => (b.distanceKm > a.distanceKm ? b : a));
    return longest.inv[BRAND_BY_CODE.get(brand)!.cabin] !== undefined;
  };

  const brandFor = (cabin: Cabin): BrandCode =>
    cabin === "J" ? "BUSINESS" : cabin === "W" ? "PREMIUM" : rng() < 0.35 ? "BASIC" : "CLASSIC";

  function returnLegs(out: SimFlight[], brand: BrandCode, seats: number): SimFlight[] | null {
    const rev = [...out].reverse().map((l) => routeFor(l.dest, l.origin));
    if (rev.some((r) => !r)) return null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const date = addDays(out[0].depLocalDate, randInt(rng, 2, 10));
      const firsts = (byRouteDate.get(`${rev[0]!.id}|${date}`) ?? []).filter((f) => canTake(f, cabinFor(f, brand), seats));
      if (!firsts.length) continue;
      const legs: SimFlight[] = [pick(rng, firsts)];
      for (let i = 1; i < rev.length; i++) {
        const prev = legs[i - 1];
        const next = onward(prev).filter((n) => n.routeId === rev[i]!.id && canTake(n, cabinFor(n, brand), seats));
        if (!next.length) break;
        legs.push(next[0]);
      }
      if (legs.length === rev.length && offerable(legs, brand)) return legs;
    }
    return null;
  }

  /** Price a direction as it would have been priced at booking time. */
  function historicPrice(legs: SimFlight[], brand: BrandCode, seats: number, bookingDate: DateStr): BrandOffer {
    const pseudo: FlightLeg[] = legs.map((l) => {
      const daysOut = diffDays(l.depLocalDate, bookingDate);
      const inv: FlightLeg["inv"] = {};
      for (const [c, v] of Object.entries(l.inv) as [Cabin, { capacity: number; sold: number }][]) {
        const est = Math.round(v.capacity * (l.finalLf[c] ?? 0.8) * bookedShare(daysOut));
        inv[c] = { capacity: v.capacity, sold: Math.min(v.capacity - seats, Math.max(0, est)) };
      }
      return { ...l, inv };
    });
    let offer = priceBrand(pseudo, brand, seats, bookingDate);
    if (offer.status !== "AVAILABLE" && brand === "BASIC") offer = priceBrand(pseudo, "CLASSIC", seats, bookingDate);
    if (offer.status !== "AVAILABLE") {
      const empty = pseudo.map((l) => ({ ...l, inv: Object.fromEntries(Object.entries(l.inv).map(([c, v]) => [c, { ...v!, sold: 0 }])) }));
      offer = priceBrand(empty, offer.brand, seats, addDays(legs[0].depLocalDate, -1));
    }
    return offer;
  }

  let nextId = opts.firstBookingId;
  let rows = 0;
  let count = 0;

  const work: [SimFlight, Cabin][] = [];
  for (const f of flights) {
    for (const c of Object.keys(f.inv) as Cabin[]) if ((f.target[c] ?? 0) > f.inv[c]!.sold) work.push([f, c]);
  }
  shuffle(rng, work);

  for (const [f, cabin] of work) {
    const inv = f.inv[cabin]!;
    const target = f.target[cabin]!;
    while (inv.sold < target) {
      const deficit = target - inv.sold;
      // Party
      let size: number = weighted(rng, [[1, 55], [2, 28], [3, 7], [4, 7], [5, 2], [6, 1]] as const);
      size = Math.min(size, deficit);
      const pax: Pax =
        size >= 3 && rng() < 0.6 ? { adults: 2, children: size - 2, infants: 0 } : { adults: size, children: 0, infants: 0 };
      if (rng() < 0.03) pax.infants = 1;
      const seats = pax.adults + pax.children;
      const brand = brandFor(cabin);

      // Outbound routing: local or connecting through a hub
      let out: SimFlight[] = [f];
      const trunk = ROUTE_BY_ID.get(f.routeId)!.kind === "TRUNK";
      if (rng() < (trunk ? 0.5 : 0.35)) {
        const asFeeder = rng() < 0.5;
        const cands = (asFeeder ? onward(f) : feeders(f)).filter((c) => canTake(c, cabinFor(c, brand), seats));
        if (cands.length) {
          const c = pick(rng, cands);
          const legs = asFeeder ? [f, c] : [c, f];
          if (isValid(legs) && offerable(legs, brand)) out = legs;
        }
      }
      const ret = rng() < 0.4 ? returnLegs(out, brand, seats) : null;

      // When it was booked & what it cost then
      const bookedAt = Math.min(opts.bookedAt(out[0], rng), opts.nowMs - 5 * MINUTE);
      const bookingDate = localDate(bookedAt, brandConfig.homeTimeZone);
      const outOffer = historicPrice(out, brand, seats, bookingDate);
      const retOffer = ret ? historicPrice(ret, brand, seats, bookingDate) : null;
      const quote = quoteTrip(
        [{ legs: out, offer: outOffer }, ...(ret && retOffer ? [{ legs: ret, offer: retOffer }] : [])],
        pax,
      );

      if (outOffer.segments.length !== out.length || (ret && retOffer!.segments.length !== ret.length)) {
        throw new Error(`Seed pricing failed for flight ${f.id} ${cabin}`);
      }

      // Commit inventory exactly as recorded on the segments
      const dirs: ["OUT" | "RET", SimFlight[], BrandOffer][] = [["OUT", out, outOffer]];
      if (ret && retOffer) dirs.push(["RET", ret, retOffer]);
      const id = nextId++;
      for (const [dir, legs, offer] of dirs) {
        offer.segments.forEach((s, i) => {
          legs[i].inv[s.cabin]!.sold += seats;
          sink.segments.push([id, dir, i + 1, s.flightId, s.cabin, s.brand, s.rbd, seats, s.fareCents]);
        });
      }

      let pnr = makePnr(rng);
      while (opts.existingPnrs.has(pnr)) pnr = makePnr(rng);
      opts.existingPnrs.add(pnr);

      // Passengers
      const family = rng() < 0.7 ? pick(rng, LAST_NAMES) : null;
      const people: Row[] = [];
      let seq = 1;
      const dobFor = (minY: number, maxY: number) => addDays(opts.today, -randInt(rng, minY * 365 + 1, maxY * 365 + 364));
      let leadFirst = "";
      let leadLast = "";
      for (let i = 0; i < pax.adults; i++) {
        const fn = pick(rng, FIRST_NAMES);
        const ln = family && i < 2 ? family : pick(rng, LAST_NAMES);
        if (i === 0) [leadFirst, leadLast] = [fn, ln];
        people.push([id, seq++, "ADT", fn, ln, dobFor(18, 74), null]);
      }
      for (let i = 0; i < pax.children; i++) people.push([id, seq++, "CHD", pick(rng, FIRST_NAMES), family ?? leadLast, dobFor(2, 11), null]);
      for (let i = 0; i < pax.infants; i++) people.push([id, seq++, "INF", pick(rng, FIRST_NAMES), family ?? leadLast, dobFor(0, 1), 1]);
      sink.passengers.push(...people);

      const o = airport(out[0].origin);
      const area = pick(rng, AREA_CODES[o.province ?? ""] ?? ["416", "514", "604"]);
      sink.bookings.push([
        id,
        pnr,
        "CONFIRMED",
        ret ? "RT" : "OW",
        out[0].origin,
        out[out.length - 1].dest,
        pax.adults,
        pax.children,
        pax.infants,
        `${strip(leadFirst)}.${strip(leadLast)}${randInt(rng, 1, 99)}@example.com`,
        `+1 ${area} 555 ${String(randInt(rng, 100, 9999)).padStart(4, "0")}`,
        "CAD",
        quote.baseCents,
        quote.taxCents,
        quote.totalCents,
        "SEED",
        new Date(bookedAt),
      ]);
      count++;
      rows += 1 + people.length + dirs.reduce((s, d) => s + d[1].length, 0);
      if (rows >= flushEvery) {
        await sink.flush();
        rows = 0;
      }
    }
  }
  await sink.flush();
  return { bookings: count, nextBookingId: nextId };
}

/** Booking-time sampler for the initial seed: lead times follow the booking curve. */
export const seedBookedAt = (today: DateStr) => (first: SimFlight, rng: Rng) => {
  const minLead = Math.max(0, diffDays(first.depLocalDate, today));
  const lead = sampleLeadDays(rng, minLead);
  return first.depUtc - lead * DAY - rng() * 6 * HOUR;
};

/** Booking-time sampler for daily top-ups: spread over the elapsed window. */
export const recentBookedAt = (fromMs: number, nowMs: number) => (first: SimFlight, rng: Rng) =>
  Math.min(first.depUtc - HOUR, fromMs + rng() * (nowMs - fromMs));
