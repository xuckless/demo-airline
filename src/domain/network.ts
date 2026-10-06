import { AIRPORT_BY_IATA, airport, HUBS } from "@/config/airports";
import { NETWORK } from "@/config/network";
import { distanceBetween } from "./geo";

export type Market = "DOM" | "TB" | "INT";

export interface Route {
  id: number;
  origin: string;
  dest: string;
  distanceKm: number;
  market: Market;
  kind: "TRUNK" | "SPOKE";
  /** Index of the NETWORK entry; direction "OUT" = a -> b. */
  entryIndex: number;
  direction: "OUT" | "IN";
}

export function marketOf(o: string, d: string): Market {
  const co = airport(o).country;
  const cd = airport(d).country;
  if (co === "CA" && cd === "CA") return "DOM";
  if ((co === "CA" && cd === "US") || (co === "US" && cd === "CA") || (co === "US" && cd === "US")) return "TB";
  return "INT";
}

export const ROUTES: Route[] = NETWORK.flatMap((e, i) => {
  const km = distanceBetween(airport(e.a), airport(e.b));
  const kind = HUBS.includes(e.a) && HUBS.includes(e.b) ? "TRUNK" : "SPOKE";
  return [
    { id: 2 * i + 1, origin: e.a, dest: e.b, distanceKm: km, market: marketOf(e.a, e.b), kind, entryIndex: i, direction: "OUT" as const },
    { id: 2 * i + 2, origin: e.b, dest: e.a, distanceKm: km, market: marketOf(e.b, e.a), kind, entryIndex: i, direction: "IN" as const },
  ];
});

export const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));
const pairKey = (o: string, d: string) => `${o}-${d}`;
export const ROUTE_BY_PAIR = new Map(ROUTES.map((r) => [pairKey(r.origin, r.dest), r]));
export const routeFor = (o: string, d: string) => ROUTE_BY_PAIR.get(pairKey(o, d));

/** Airports actually served by the network. */
export const SERVED = [...new Set(ROUTES.map((r) => r.origin))]
  .map((c) => AIRPORT_BY_IATA.get(c)!)
  .sort((x, y) => x.city.localeCompare(y.city));

export function odDistanceKm(o: string, d: string) {
  return distanceBetween(airport(o), airport(d));
}
