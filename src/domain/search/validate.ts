import { type DateStr, MINUTE } from "../time";
import type { FlightLeg } from "../types";
import { MAX_CONNECTION_MIN, MAX_ELAPSED_MIN, MIN_DEPARTURE_LEAD_MIN, minConnectMinutes } from "./connections";
import { pathsFor } from "./paths";

/** Check that a selected set of legs is an itinerary search could have offered. */
export function validateItinerary(
  legs: FlightLeg[],
  o: { from: string; to: string; date: DateStr; nowMs: number; minDepUtc?: number },
): string | null {
  if (!legs.length || legs.length > 3) return "Invalid flight selection.";
  if (legs[0].origin !== o.from || legs[legs.length - 1].dest !== o.to) return "Selected flights don't match your search.";
  if (legs[0].depLocalDate !== o.date) return "Selected flights don't match your travel date.";
  if (legs[0].depUtc < Math.max(o.nowMs + MIN_DEPARTURE_LEAD_MIN * MINUTE, o.minDepUtc ?? 0)) return "This flight is no longer available for booking.";
  const ok = pathsFor(o.from, o.to).some((p) => p.routes.length === legs.length && p.routes.every((r, i) => r.id === legs[i].routeId));
  if (!ok) return "Invalid routing.";
  for (let i = 1; i < legs.length; i++) {
    const gap = (legs[i].depUtc - legs[i - 1].arrUtc) / MINUTE;
    if (gap < minConnectMinutes(legs[i - 1], legs[i]) || gap > MAX_CONNECTION_MIN) return "Connection time is not valid.";
  }
  if ((legs[legs.length - 1].arrUtc - legs[0].depUtc) / MINUTE > MAX_ELAPSED_MIN[legs.length - 1]) return "Itinerary is too long.";
  return null;
}
