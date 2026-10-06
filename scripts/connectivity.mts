// Dev check: how many O&D markets have zero itineraries on sample days (empty inventory).
import { generateSchedules } from "@/domain/schedule/generateSchedules";
import { materializeFlights } from "@/domain/schedule/materializeFlights";
import { offsetPeriods } from "@/domain/schedule/periods";
import { pathsFor } from "@/domain/search/paths";
import { buildItineraries } from "@/domain/search/buildItineraries";
import { ROUTE_BY_ID, SERVED } from "@/domain/network";
import { addDays } from "@/domain/time";
import type { FlightLeg } from "@/domain/types";

const start = process.argv[2] ?? "2026-09-22";
const s = generateSchedules(offsetPeriods(start, addDays(start, 400)), 1);
const days = [addDays(start, 28), addDays(start, 60)];
const fl = materializeFlights(s, addDays(days[0], -1), addDays(days[1], 2), 1);
const legs: FlightLeg[] = fl.map((f) => ({ ...f, distanceKm: ROUTE_BY_ID.get(f.routeId)!.distanceKm, inv: Object.fromEntries(f.cabins.map((c) => [c.cabin, { capacity: c.capacity, sold: 0 }])) }));
const by = new Map<number, FlightLeg[]>();
for (const l of legs) (by.get(l.routeId) ?? by.set(l.routeId, []).get(l.routeId)!).push(l);
let markets = 0, zero = 0, few = 0;
const zeros: string[] = [];
for (const day of days) {
  for (const o of SERVED) for (const d of SERVED) {
    const paths = pathsFor(o.iata, d.iata);
    if (!paths.length) continue;
    markets++;
    const n = buildItineraries({ date: day, seats: 1, nowMs: 0, today: start, paths, legsByRoute: by, limit: 999 }).length;
    if (n === 0) { zero++; zeros.push(`${o.iata}-${d.iata}`); } else if (n < 2) few++;
  }
}
console.log(`markets×days ${markets}, zero ${zero}, only-1 ${few}`);
console.log(zeros.slice(0, 40).join(" "));
