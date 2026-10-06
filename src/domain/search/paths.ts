import { airport, HUBS } from "@/config/airports";
import { DAILY, NETWORK } from "@/config/network";
import { odDistanceKm, type Route, routeFor, SERVED } from "../network";

export interface Path {
  routes: Route[];
  circuity: number;
}

const MAX_CIRCUITY_1 = 1.6;
const MAX_CIRCUITY_1_WITH_DIRECT = 1.3;
const MAX_CIRCUITY_2 = 1.4;
const GOOD_1STOP = 1.25;
const MIN_CONNECT_KM = 250;

const cache = new Map<string, Path[]>();

/** Candidate routings O→D through the hub network (direct, 1-stop, 2-stop). */
export function pathsFor(o: string, d: string): Path[] {
  const key = `${o}-${d}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: Path[] = [];
  if (o !== d && airport(o) && airport(d)) {
    const gc = Math.max(1, odDistanceKm(o, d));
    const sum = (rs: Route[]) => rs.reduce((s, r) => s + r.distanceKm, 0);
    const direct = routeFor(o, d);
    if (direct) out.push({ routes: [direct], circuity: 1 });
    if (direct || gc >= MIN_CONNECT_KM) {
      // A daily nonstop makes long detours pointless; a few-times-weekly one doesn't.
      const dailyDirect = direct && (NETWORK[direct.entryIndex].dowMask ?? DAILY) === DAILY;
      const limit1 = dailyDirect ? MAX_CIRCUITY_1_WITH_DIRECT : MAX_CIRCUITY_1;
      for (const h of HUBS) {
        if (h === o || h === d) continue;
        const r1 = routeFor(o, h);
        const r2 = routeFor(h, d);
        if (!r1 || !r2) continue;
        const c = sum([r1, r2]) / gc;
        if (c <= limit1) out.push({ routes: [r1, r2], circuity: c });
      }
      const hasGood1 = out.some((p) => p.routes.length <= 2 && p.circuity <= GOOD_1STOP);
      if (!hasGood1) {
        for (const h1 of HUBS) {
          for (const h2 of HUBS) {
            if (h1 === h2 || [o, d].includes(h1) || [o, d].includes(h2)) continue;
            const r1 = routeFor(o, h1);
            const r2 = routeFor(h1, h2);
            const r3 = routeFor(h2, d);
            if (!r1 || !r2 || !r3) continue;
            const c = sum([r1, r2, r3]) / gc;
            if (c <= MAX_CIRCUITY_2) out.push({ routes: [r1, r2, r3], circuity: c });
          }
        }
      }
    }
  }
  cache.set(key, out);
  return out;
}

/** Destinations bookable from an origin. */
export function reachableFrom(o: string): string[] {
  return SERVED.filter((a) => a.iata !== o && pathsFor(o, a.iata).length > 0).map((a) => a.iata);
}
