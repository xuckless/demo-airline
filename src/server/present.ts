import "server-only";
import type { ItinDTO, LegDTO } from "@/components/results/types";
import { airport } from "@/config/airports";
import { BRAND_BY_CODE, BRAND_CODES, type BrandCode } from "@/config/fares";
import { AIRCRAFT_BY_CODE, CABIN_NAMES } from "@/config/fleet";
import type { Itinerary } from "@/domain/search/buildItineraries";
import { MINUTE } from "@/domain/time";
import type { BrandOffer, FlightLeg } from "@/domain/types";
import { dayOffset, flightNo, fmtDate, fmtDuration, fmtMoney, fmtTime } from "@/lib/format";

export function legDTO(l: FlightLeg): LegDTO {
  return {
    flightNo: flightNo(l.flightNumber),
    origin: l.origin,
    originCity: airport(l.origin).city,
    dest: l.dest,
    destCity: airport(l.dest).city,
    depTime: fmtTime(l.depUtc, l.origin),
    arrTime: fmtTime(l.arrUtc, l.dest),
    arrDayOffset: dayOffset(l.depUtc, l.origin, l.arrUtc, l.dest),
    date: fmtDate(l.depLocalDate),
    aircraft: AIRCRAFT_BY_CODE.get(l.aircraft)?.shortName ?? l.aircraft,
    duration: fmtDuration((l.arrUtc - l.depUtc) / MINUTE),
  };
}

export function stopsLabel(legs: FlightLeg[]) {
  if (legs.length === 1) return "Nonstop";
  const via = legs.slice(1).map((l) => l.origin).join(", ");
  return `${legs.length - 1} stop${legs.length > 2 ? "s" : ""} · ${via}`;
}

/** Explain which cabin each segment is in when a premium fare mixes cabins. */
export function cabinNote(offer: BrandOffer, legs: FlightLeg[]): string | null {
  if (!offer.mixed) return null;
  return offer.segments.map((s, i) => `${legs[i].origin}–${legs[i].dest}: ${CABIN_NAMES[s.cabin]}`).join(" · ");
}

export function itinDTO(it: Itinerary, hrefFor: (key: string, brand: BrandCode) => string): ItinDTO {
  const first = it.legs[0];
  const last = it.legs[it.legs.length - 1];
  return {
    key: it.key,
    depTime: fmtTime(it.depUtc, first.origin),
    arrTime: fmtTime(it.arrUtc, last.dest),
    arrDayOffset: dayOffset(it.depUtc, first.origin, it.arrUtc, last.dest),
    origin: first.origin,
    dest: last.dest,
    duration: fmtDuration(it.durationMin),
    stopsLabel: stopsLabel(it.legs),
    nonstop: it.stops === 0,
    connections: it.connections.map((c) => ({ airport: c.airport, city: airport(c.airport).city, duration: fmtDuration(c.minutes) })),
    legs: it.legs.map(legDTO),
    offers: BRAND_CODES.map((b) => {
      const o = it.offers[b];
      return {
        brand: b,
        name: BRAND_BY_CODE.get(b)!.name,
        status: o.status,
        price: fmtMoney(o.fareCents),
        seatsLeft: o.seatsLeft,
        mixed: o.mixed,
        cabinNote: cabinNote(o, it.legs),
        rbds: o.segments.map((s) => s.rbd).join("/"),
        href: hrefFor(it.key, b),
      };
    }),
    lowestPrice: it.lowest ? fmtMoney(it.lowest.fareCents) : null,
  };
}
