import { BRAND_BY_CODE, type BrandCode, LADDERS } from "@/config/fares";
import { odDistanceKm } from "../network";
import { type DateStr, diffDays } from "../time";
import type { BrandOffer, FlightLeg, PricedSegment } from "../types";
import { journeyFare } from "./fare";
import { lowestOpenBucket } from "./rm";

/**
 * Price one fare brand over a sequence of legs (one direction of travel).
 * - Economy brands need economy open on every leg.
 * - Premium/Business must exist on the longest leg; other legs fall back down
 *   the brand chain (mixed cabin).
 */
export function priceBrand(legs: FlightLeg[], brandCode: BrandCode, seats: number, today: DateStr): BrandOffer {
  const brand = BRAND_BY_CODE.get(brandCode)!;
  const empty = (status: BrandOffer["status"]): BrandOffer => ({
    brand: brandCode,
    status,
    fareCents: 0,
    seatsLeft: 0,
    mixed: false,
    segments: [],
  });
  const longest = legs.reduce((a, b) => (b.distanceKm > a.distanceKm ? b : a));
  if (!longest.inv[brand.cabin]) return empty("NOT_OFFERED");

  const chosen: { leg: FlightLeg; brand: BrandCode; rbd: string; seatsLeft: number; bucket: (typeof LADDERS)[BrandCode][number] }[] = [];
  let mixed = false;
  for (const leg of legs) {
    let code: BrandCode | null = brandCode;
    while (code && !leg.inv[BRAND_BY_CODE.get(code)!.cabin]) code = BRAND_BY_CODE.get(code)!.fallback;
    if (!code) return empty("NOT_OFFERED");
    if (code !== brandCode) mixed = true;
    const cabin = BRAND_BY_CODE.get(code)!.cabin;
    const open = lowestOpenBucket(LADDERS[code], leg.inv[cabin]!, seats, diffDays(leg.depLocalDate, today));
    if (!open) return empty("SOLD_OUT");
    chosen.push({ leg, brand: code, rbd: open.bucket.rbd, seatsLeft: open.seatsLeft, bucket: open.bucket });
  }

  const first = legs[0];
  const last = legs[legs.length - 1];
  const { totalCents, segmentCents } = journeyFare(
    odDistanceKm(first.origin, last.dest),
    chosen.map((c) => ({
      distanceKm: c.leg.distanceKm,
      cabin: BRAND_BY_CODE.get(c.brand)!.cabin,
      aircraft: c.leg.aircraft,
      bucket: c.bucket,
    })),
    first.depLocalDate,
  );
  const segments: PricedSegment[] = chosen.map((c, i) => ({
    flightId: c.leg.id,
    cabin: BRAND_BY_CODE.get(c.brand)!.cabin,
    brand: c.brand,
    rbd: c.rbd,
    seatsLeft: c.seatsLeft,
    fareCents: segmentCents[i],
  }));
  return {
    brand: brandCode,
    status: "AVAILABLE",
    fareCents: totalCents,
    seatsLeft: Math.min(...segments.map((s) => s.seatsLeft)),
    mixed,
    segments,
  };
}
