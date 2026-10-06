import { describe, expect, it } from "vitest";
import { airport, HUBS } from "@/config/airports";
import { generateSchedules } from "../schedule/generateSchedules";
import { materializeFlights } from "../schedule/materializeFlights";
import { offsetPeriods } from "../schedule/periods";
import { ROUTE_BY_ID } from "../network";
import { utcToLocal } from "../time";

const periods = offsetPeriods("2026-10-20", "2026-11-10");
const schedules = generateSchedules(periods, 1);

describe("schedules", () => {
  it("splits periods at the DST change", () => {
    expect(periods.map((p) => p.from)).toEqual(["2026-10-20", "2026-11-01"]);
  });

  it("has unique flight numbers per day", () => {
    const flights = materializeFlights(schedules, "2026-10-28", "2026-11-03", 1);
    const keys = flights.map((f) => `${f.flightNumber}|${f.depLocalDate}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps scheduled local times across DST while UTC shifts", () => {
    const flights = materializeFlights(schedules, "2026-10-30", "2026-11-02", 1);
    for (const f of flights) {
      const s = schedules[f.scheduleIndex];
      expect(utcToLocal(f.depUtc, airport(f.origin).tz)).toEqual({ date: f.depLocalDate, minutes: s.depLocalMin });
    }
    // Toronto shifts to UTC-5 on Nov 1; Cancún (no DST) does not.
    const yyz = flights.find((f) => f.origin === "YYZ" && f.depLocalDate === "2026-11-02")!;
    expect(new Date(yyz.depUtc).getUTCHours() * 60 + new Date(yyz.depUtc).getUTCMinutes()).toBe((schedules[yyz.scheduleIndex].depLocalMin + 300) % 1440);
  });

  it("builds banked hub connections of 45–105 minutes", () => {
    const flights = materializeFlights(schedules, "2026-10-28", "2026-10-28", 1);
    let banked = 0;
    for (const inb of flights.filter((f) => HUBS.includes(f.dest) && !HUBS.includes(f.origin))) {
      const gaps = flights
        .filter((o) => o.origin === inb.dest && o.dest !== inb.origin)
        .map((o) => (o.depUtc - inb.arrUtc) / 60000)
        .filter((g) => g >= 45 && g <= 105);
      if (gaps.length) banked++;
    }
    const inbound = flights.filter((f) => HUBS.includes(f.dest) && !HUBS.includes(f.origin)).length;
    expect(banked / inbound).toBeGreaterThan(0.8);
  });

  it("departs between 06:00 and 22:30 local", () => {
    for (const s of schedules) {
      const r = ROUTE_BY_ID.get(s.routeId)!;
      expect(airport(r.origin)).toBeTruthy();
      expect(s.depLocalMin).toBeGreaterThanOrEqual(360);
      expect(s.depLocalMin).toBeLessThanOrEqual(22 * 60 + 30);
    }
  });
});
