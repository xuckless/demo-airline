import { AIRCRAFT_BY_CODE } from "@/config/fleet";
import { routeFor } from "../network";
import { addDays, localToUtc, MINUTE } from "../time";
import { airport } from "@/config/airports";
import type { FlightLeg } from "../types";

let nextId = 1;

/** Build a dated flight on a real network route at local time hh:mm. */
export function leg(o: string, d: string, date: string, hhmm: string, aircraft = "32N", block?: number, soldPct = 0): FlightLeg {
  const r = routeFor(o, d);
  if (!r) throw new Error(`no route ${o}-${d}`);
  const [h, m] = hhmm.split(":").map(Number);
  const dep = localToUtc(date, h * 60 + m, airport(o).tz);
  const inv: FlightLeg["inv"] = {};
  for (const c of AIRCRAFT_BY_CODE.get(aircraft)!.cabins) inv[c.cabin] = { capacity: c.seats, sold: Math.round(c.seats * soldPct) };
  return {
    id: nextId++,
    flightNumber: 100 + nextId,
    routeId: r.id,
    origin: o,
    dest: d,
    aircraft,
    depLocalDate: date,
    depUtc: dep,
    arrUtc: dep + (block ?? Math.round(r.distanceKm / 10 + 30)) * MINUTE,
    distanceKm: r.distanceKm,
    inv,
  };
}

export const byRoute = (legs: FlightLeg[]) => {
  const m = new Map<number, FlightLeg[]>();
  for (const l of legs) (m.get(l.routeId) ?? m.set(l.routeId, []).get(l.routeId)!).push(l);
  return m;
};

export const TODAY = "2026-10-06";
export const NOW = localToUtc(TODAY, 9 * 60, "America/Toronto");
export const in30 = addDays(TODAY, 30);
