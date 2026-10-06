import { CABIN_MULTIPLIER, CONNECTION_FACTOR, DOW_FACTOR, type FareBucket } from "@/config/fares";
import { LIE_FLAT, type Cabin } from "@/config/fleet";
import { retailRound } from "../money";
import { type DateStr, jsDow } from "../time";

/** Economy reference fare in dollars for a market distance. */
export const baseEconomyDollars = (km: number) => 35 + 0.19 * Math.pow(km, 0.95);

export function cabinBaseDollars(km: number, cabin: Cabin, aircraft: string) {
  const lieFlat = cabin === "J" && LIE_FLAT.has(aircraft) ? 1.15 : 1;
  return baseEconomyDollars(km) * CABIN_MULTIPLIER[cabin] * lieFlat;
}

export interface FareSegmentInput {
  distanceKm: number;
  cabin: Cabin;
  aircraft: string;
  bucket: FareBucket;
}

/**
 * Origin-destination fare per seated passenger: the O&D base is prorated over
 * segments by distance, each share priced at that segment's cabin & bucket.
 * Returns the retail-rounded total and each segment's share (cents).
 */
export function journeyFare(odKm: number, segments: FareSegmentInput[], depDate: DateStr) {
  const totalKm = segments.reduce((s, x) => s + x.distanceKm, 0) || 1;
  const stops = segments.length - 1;
  const factor = (CONNECTION_FACTOR[stops] ?? CONNECTION_FACTOR[CONNECTION_FACTOR.length - 1]) * DOW_FACTOR[jsDow(depDate)];
  const raw = segments.map((s) => (s.distanceKm / totalKm) * cabinBaseDollars(odKm, s.cabin, s.aircraft) * s.bucket.multiplier * factor);
  const sum = raw.reduce((a, b) => a + b, 0);
  const totalCents = retailRound(sum);
  // Allocate rounded total to segments proportionally; last segment absorbs the remainder.
  let allocated = 0;
  const segmentCents = raw.map((r, i) => {
    if (i === raw.length - 1) return totalCents - allocated;
    const c = Math.round((r / sum) * totalCents);
    allocated += c;
    return c;
  });
  return { totalCents, segmentCents };
}
