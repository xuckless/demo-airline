import type { BrandCode } from "@/config/fares";
import type { Cabin } from "@/config/fleet";

export interface CabinInv {
  capacity: number;
  sold: number;
}

/** A dated flight with its live inventory, as used by search & pricing. */
export interface FlightLeg {
  id: number;
  flightNumber: number;
  routeId: number;
  origin: string;
  dest: string;
  aircraft: string;
  depLocalDate: string;
  depUtc: number;
  arrUtc: number;
  distanceKm: number;
  inv: Partial<Record<Cabin, CabinInv>>;
}

export interface Pax {
  adults: number;
  children: number;
  infants: number;
}

export const seatsFor = (p: Pax) => p.adults + p.children;

export interface PricedSegment {
  flightId: number;
  cabin: Cabin;
  brand: BrandCode;
  rbd: string;
  seatsLeft: number;
  /** Share of the per-seat fare attributed to this segment (cents). */
  fareCents: number;
}

export type OfferStatus = "AVAILABLE" | "SOLD_OUT" | "NOT_OFFERED";

export interface BrandOffer {
  brand: BrandCode;
  status: OfferStatus;
  /** Per seated passenger, before taxes (cents). */
  fareCents: number;
  seatsLeft: number;
  mixed: boolean;
  segments: PricedSegment[];
}
