import "server-only";
import { airport } from "@/config/airports";
import { loadLegs } from "@/db/seed/load";
import { buildItineraries, type Itinerary, type SortKey } from "@/domain/search/buildItineraries";
import { pathsFor } from "@/domain/search/paths";
import { addDays, DAY, type DateStr, startOfLocalDay } from "@/domain/time";
import type { FlightLeg } from "@/domain/types";
import { seedConfig } from "@/config/seed";
import { nowMs, today } from "@/lib/clock";
import { appDb } from "./db";

export interface SearchArgs {
  from: string;
  to: string;
  date: DateStr;
  seats: number;
  sort?: SortKey;
  minDepUtc?: number;
}

async function legsFor(from: string, to: string, firstDate: DateStr, lastDate: DateStr) {
  const paths = pathsFor(from, to);
  const routeIds = [...new Set(paths.flatMap((p) => p.routes.map((r) => r.id)))];
  if (!routeIds.length) return { paths, legsByRoute: new Map<number, FlightLeg[]>() };
  const start = startOfLocalDay(firstDate, airport(from).tz);
  const end = startOfLocalDay(lastDate, airport(from).tz) + 2 * DAY;
  const { pg } = await appDb();
  const legs = await loadLegs(pg, `f.route_id = ANY($1::int[]) AND f.dep_utc >= $2 AND f.dep_utc < $3`, [
    routeIds,
    new Date(start).toISOString(),
    new Date(end).toISOString(),
  ]);
  const legsByRoute = new Map<number, FlightLeg[]>();
  for (const l of legs) (legsByRoute.get(l.routeId) ?? legsByRoute.set(l.routeId, []).get(l.routeId)!).push(l);
  return { paths, legsByRoute };
}

export async function searchFlights(a: SearchArgs): Promise<Itinerary[]> {
  const { paths, legsByRoute } = await legsFor(a.from, a.to, a.date, a.date);
  return buildItineraries({ ...a, nowMs: nowMs(), today: today(), paths, legsByRoute });
}

export interface StripDay {
  date: DateStr;
  lowestCents: number | null;
  bookable: boolean;
}

/** Lowest fare per day around a date (Porter-style date strip). */
export async function dateStrip(a: Omit<SearchArgs, "date" | "sort"> & { center: DateStr; minDate?: DateStr }): Promise<StripDay[]> {
  const t = today();
  const min = a.minDate && a.minDate > t ? a.minDate : t;
  const max = addDays(t, seedConfig.horizonDays);
  let first = addDays(a.center, -3);
  if (first < min) first = min;
  let last = addDays(first, 6);
  if (last > max) {
    last = max;
    first = addDays(max, -6) < min ? min : addDays(max, -6);
  }
  const { paths, legsByRoute } = await legsFor(a.from, a.to, first, last);
  const days: StripDay[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const its = buildItineraries({ date: d, seats: a.seats, nowMs: nowMs(), today: t, paths, legsByRoute, minDepUtc: a.minDepUtc, limit: 500 });
    const prices = its.map((i) => i.lowest?.fareCents).filter((x): x is number => x !== undefined);
    days.push({ date: d, lowestCents: prices.length ? Math.min(...prices) : null, bookable: true });
  }
  return days;
}

/** Re-load exact legs by id (selection → passengers → booking). */
export async function legsById(ids: number[]): Promise<FlightLeg[] | null> {
  const { pg } = await appDb();
  const legs = await loadLegs(pg, `f.id = ANY($1::int[])`, [ids]);
  const byId = new Map(legs.map((l) => [l.id, l]));
  const ordered = ids.map((id) => byId.get(id));
  return ordered.every(Boolean) ? (ordered as FlightLeg[]) : null;
}
