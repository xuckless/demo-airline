import { airport } from "@/config/airports";
import type { FlightLeg } from "../types";

export const MAX_CONNECTION_MIN = 360;
export const MIN_DEPARTURE_LEAD_MIN = 90;
export const MAX_ELAPSED_MIN = [Infinity, 14 * 60, 18 * 60];

/** Minimum connecting time at a hub between two legs. */
export function minConnectMinutes(inbound: FlightLeg, outbound: FlightLeg): number {
  const from = airport(inbound.origin).country;
  const hub = airport(outbound.origin).country;
  const to = airport(outbound.dest).country;
  if (hub === "CA" && to === "US") return 75; // U.S. preclearance
  if (from !== "CA" || to !== "CA") return 60;
  return 45;
}
