import { seedConfig } from "@/config/seed";
import type { Cabin } from "@/config/fleet";
import { hash32, mulberry32, type Rng } from "../rng";
import { type DateStr, jsDow } from "../time";
import { airport } from "@/config/airports";

const { curveK: K, curveP: P } = seedConfig;
export const MAX_LEAD_DAYS = 330;

/** Share of a flight's final passengers already booked at d days out. */
export const bookedShare = (d: number) => (d <= 0 ? 1 : 1 / (1 + Math.pow(d / K, P)));

/** Sample booking lead time (days before departure) given it is at least minLead. */
export function sampleLeadDays(rng: Rng, minLead: number): number {
  const u = rng() * bookedShare(Math.max(0, minLead));
  const d = u <= 0 ? MAX_LEAD_DAYS : K * Math.pow(1 / u - 1, 1 / P);
  return Math.min(MAX_LEAD_DAYS, Math.max(minLead, d));
}

/** Deterministic final load factor for one flight-cabin. */
export function finalLoadFactor(flightNumber: number, depDate: DateStr, routeKey: string, dest: string, cabin: Cabin): number {
  const base = seedConfig.finalLf[cabin];
  const routeNoise = (mulberry32(hash32("route", routeKey))() - 0.5) * 0.12;
  const dayNoise = (mulberry32(hash32("flt", flightNumber, depDate, cabin))() - 0.5) * 0.12;
  const dow = jsDow(depDate);
  let dowAdj = [0.04, 0, -0.06, -0.05, 0.01, 0.05, -0.02][dow];
  if (airport(dest).region === "SUN" && (dow === 6 || dow === 0)) dowAdj += 0.04;
  return Math.min(0.98, Math.max(0.3, base + routeNoise + dayNoise + dowAdj));
}

export function targetSold(capacity: number, finalLf: number, daysOut: number) {
  return Math.min(capacity, Math.round(capacity * finalLf * bookedShare(daysOut)));
}
