import { BRAND_CODES, type BrandCode } from "@/config/fares";
import { priceBrand } from "../pricing/offer";
import { type DateStr, MINUTE } from "../time";
import type { BrandOffer, FlightLeg } from "../types";
import { MAX_CONNECTION_MIN, MAX_ELAPSED_MIN, MIN_DEPARTURE_LEAD_MIN, minConnectMinutes } from "./connections";
import type { Path } from "./paths";

export type SortKey = "dep" | "duration" | "price";

export interface Itinerary {
  key: string;
  legs: FlightLeg[];
  stops: number;
  depUtc: number;
  arrUtc: number;
  durationMin: number;
  connections: { airport: string; minutes: number }[];
  offers: Record<BrandCode, BrandOffer>;
  lowest: { brand: BrandCode; fareCents: number } | null;
}

export interface SearchInput {
  date: DateStr;
  seats: number;
  nowMs: number;
  today: DateStr;
  paths: Path[];
  /** Flights per route, any order. */
  legsByRoute: Map<number, FlightLeg[]>;
  /** Earliest allowed first departure (e.g. after the outbound arrives). */
  minDepUtc?: number;
  sort?: SortKey;
  limit?: number;
}

export const itineraryKey = (legs: FlightLeg[]) => legs.map((l) => l.id).join("-");

function chain(input: SearchInput, path: Path): FlightLeg[][] {
  const stops = path.routes.length - 1;
  const earliest = Math.max(input.nowMs + MIN_DEPARTURE_LEAD_MIN * MINUTE, input.minDepUtc ?? 0);
  const firsts = (input.legsByRoute.get(path.routes[0].id) ?? []).filter(
    (l) => l.depLocalDate === input.date && l.depUtc >= earliest,
  );
  const out: FlightLeg[][] = [];
  const extend = (acc: FlightLeg[]) => {
    if (acc.length === path.routes.length) {
      const elapsed = (acc[acc.length - 1].arrUtc - acc[0].depUtc) / MINUTE;
      if (elapsed <= MAX_ELAPSED_MIN[stops]) out.push(acc);
      return;
    }
    const prev = acc[acc.length - 1];
    for (const next of input.legsByRoute.get(path.routes[acc.length].id) ?? []) {
      const gap = (next.depUtc - prev.arrUtc) / MINUTE;
      if (gap >= minConnectMinutes(prev, next) && gap <= MAX_CONNECTION_MIN) extend([...acc, next]);
    }
  };
  for (const f of firsts) extend([f]);
  return out;
}

/** Drop options that leave earlier and arrive later with as many or more stops. */
function pruneDominated(its: FlightLeg[][]): FlightLeg[][] {
  // Per first flight keep the earliest-arriving continuation.
  const byFirst = new Map<number, FlightLeg[]>();
  for (const it of its) {
    const k = it[0].id;
    const cur = byFirst.get(k);
    const arr = it[it.length - 1].arrUtc;
    if (!cur || arr < cur[cur.length - 1].arrUtc || (arr === cur[cur.length - 1].arrUtc && it.length < cur.length)) byFirst.set(k, it);
  }
  const xs = [...byFirst.values()];
  return xs.filter((a) => {
    const aDep = a[0].depUtc;
    const aArr = a[a.length - 1].arrUtc;
    return !xs.some((b) => {
      if (b === a || b.length > a.length) return false;
      const bDep = b[0].depUtc;
      const bArr = b[b.length - 1].arrUtc;
      return bDep >= aDep && bArr <= aArr && (bDep > aDep || bArr < aArr || b.length < a.length);
    });
  });
}

export function buildItineraries(input: SearchInput): Itinerary[] {
  const raw = input.paths.flatMap((p) => chain(input, p));
  const pruned = pruneDominated(raw);
  const its = pruned.map((legs): Itinerary => {
    const offers = Object.fromEntries(BRAND_CODES.map((b) => [b, priceBrand(legs, b, input.seats, input.today)])) as Record<
      BrandCode,
      BrandOffer
    >;
    const available = BRAND_CODES.map((b) => offers[b]).filter((o) => o.status === "AVAILABLE");
    const lowest = available.length
      ? available.reduce((a, b) => (b.fareCents < a.fareCents ? b : a))
      : null;
    return {
      key: itineraryKey(legs),
      legs,
      stops: legs.length - 1,
      depUtc: legs[0].depUtc,
      arrUtc: legs[legs.length - 1].arrUtc,
      durationMin: (legs[legs.length - 1].arrUtc - legs[0].depUtc) / MINUTE,
      connections: legs.slice(1).map((l, i) => ({ airport: l.origin, minutes: (l.depUtc - legs[i].arrUtc) / MINUTE })),
      offers,
      lowest: lowest ? { brand: lowest.brand, fareCents: lowest.fareCents } : null,
    };
  });
  return sortItineraries(its, input.sort ?? "dep").slice(0, input.limit ?? 40);
}

export function sortItineraries(its: Itinerary[], sort: SortKey): Itinerary[] {
  const price = (i: Itinerary) => i.lowest?.fareCents ?? Number.MAX_SAFE_INTEGER;
  const cmp: Record<SortKey, (a: Itinerary, b: Itinerary) => number> = {
    dep: (a, b) => a.depUtc - b.depUtc || a.durationMin - b.durationMin,
    duration: (a, b) => a.durationMin - b.durationMin || a.depUtc - b.depUtc,
    price: (a, b) => price(a) - price(b) || a.depUtc - b.depUtc,
  };
  return [...its].sort(cmp[sort]);
}
