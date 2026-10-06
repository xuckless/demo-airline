import { INFANT_FEE_CENTS } from "@/config/fares";
import type { BrandOffer, FlightLeg, Pax } from "../types";
import { type TaxLine, taxesPerSeat } from "./taxes";

export interface DirectionQuote {
  origin: string;
  dest: string;
  fareCents: number; // per seated pax
  taxes: TaxLine[]; // per seated pax
  taxCentsPerSeat: number;
}

export interface TripQuote {
  directions: DirectionQuote[];
  pax: Pax;
  baseCents: number;
  taxCents: number;
  infantFeeCents: number;
  totalCents: number;
}

export function quoteTrip(directions: { legs: FlightLeg[]; offer: BrandOffer }[], pax: Pax): TripQuote {
  const seats = pax.adults + pax.children;
  const dq = directions.map(({ legs, offer }) => {
    const origin = legs[0].origin;
    const dest = legs[legs.length - 1].dest;
    const connections = legs.slice(1).map((l) => l.origin);
    const taxes = taxesPerSeat(origin, dest, connections, offer.fareCents);
    return { origin, dest, fareCents: offer.fareCents, taxes, taxCentsPerSeat: taxes.reduce((s, t) => s + t.cents, 0) };
  });
  const infantFeeCents = pax.infants * INFANT_FEE_CENTS * directions.length;
  const baseCents = seats * dq.reduce((s, d) => s + d.fareCents, 0) + infantFeeCents;
  const taxCents = seats * dq.reduce((s, d) => s + d.taxCentsPerSeat, 0);
  return { directions: dq, pax, baseCents, taxCents, infantFeeCents, totalCents: baseCents + taxCents };
}
