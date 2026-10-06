import { AIRCRAFT_BY_CODE } from "@/config/fleet";

/** Scheduled block time in minutes, with a simple jet-stream adjustment. */
export function blockMinutes(km: number, aircraftCode: string, westbound: boolean): number {
  const ac = AIRCRAFT_BY_CODE.get(aircraftCode)!;
  const air = (km / ac.cruiseKmh) * 60;
  const wind = westbound ? 1.1 : 0.93;
  return Math.max(35, Math.round(((30 + air) * wind) / 5) * 5);
}
