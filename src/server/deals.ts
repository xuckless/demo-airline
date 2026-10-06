import "server-only";
import { airport } from "@/config/airports";
import { loadLegs } from "@/db/seed/load";
import { routeFor } from "@/domain/network";
import { priceBrand } from "@/domain/pricing/offer";
import { addDays } from "@/domain/time";
import { today } from "@/lib/clock";
import { appDb } from "./db";

export interface Deal {
  from: string;
  to: string;
  city: string;
  date: string;
  fareCents: number;
}

/** Cheapest direct Basic/Classic fare in the next ~5 weeks for a few showcase routes. */
export async function featuredDeals(pairs: [string, string][]): Promise<Deal[]> {
  const { pg } = await appDb();
  const t = today();
  const routeIds = pairs.map(([a, b]) => routeFor(a, b)!.id);
  const legs = await loadLegs(pg, `f.route_id = ANY($1::int[]) AND f.dep_local_date BETWEEN $2 AND $3`, [
    routeIds,
    addDays(t, 3),
    addDays(t, 40),
  ]);
  return pairs
    .map(([from, to]) => {
      const rid = routeFor(from, to)!.id;
      let best: Deal | null = null;
      for (const l of legs.filter((x) => x.routeId === rid)) {
        for (const b of ["BASIC", "CLASSIC"] as const) {
          const o = priceBrand([l], b, 1, t);
          if (o.status === "AVAILABLE" && (!best || o.fareCents < best.fareCents)) {
            best = { from, to, city: airport(to).city, date: l.depLocalDate, fareCents: o.fareCents };
          }
        }
      }
      return best;
    })
    .filter((d): d is Deal => d !== null);
}
