import { airport } from "@/config/airports";
import { AIRCRAFT_BY_CODE, type Cabin } from "@/config/fleet";
import { ROUTE_BY_ID } from "../network";
import { addDays, type DateStr, isoDow, localToUtc, MINUTE } from "../time";
import type { Schedule } from "./generateSchedules";

export interface FlightInstance {
  id: number;
  scheduleIndex: number;
  flightNumber: number;
  routeId: number;
  origin: string;
  dest: string;
  aircraft: string;
  depLocalDate: DateStr;
  depUtc: number;
  arrUtc: number;
  blockMin: number;
  cabins: { cabin: Cabin; capacity: number }[];
}

/** Expand schedules into dated flights for [from, to]. IDs start at firstId. */
export function materializeFlights(schedules: Schedule[], from: DateStr, to: DateStr, firstId: number): FlightInstance[] {
  const out: FlightInstance[] = [];
  let id = firstId;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const dowBit = 1 << (isoDow(d) - 1);
    schedules.forEach((s, idx) => {
      if (d < s.effectiveFrom || d > s.effectiveTo || !(s.dowMask & dowBit)) return;
      const r = ROUTE_BY_ID.get(s.routeId)!;
      const depUtc = localToUtc(d, s.depLocalMin, airport(r.origin).tz);
      out.push({
        id: id++,
        scheduleIndex: idx,
        flightNumber: s.flightNumber,
        routeId: r.id,
        origin: r.origin,
        dest: r.dest,
        aircraft: s.aircraft,
        depLocalDate: d,
        depUtc,
        arrUtc: depUtc + s.blockMin * MINUTE,
        blockMin: s.blockMin,
        cabins: AIRCRAFT_BY_CODE.get(s.aircraft)!.cabins.map((c) => ({ cabin: c.cabin, capacity: c.seats })),
      });
    });
  }
  return out;
}
