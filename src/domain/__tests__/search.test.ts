import { describe, expect, it } from "vitest";
import { pathsFor, reachableFrom } from "../search/paths";
import { buildItineraries } from "../search/buildItineraries";
import { byRoute, in30, leg, NOW, TODAY } from "./fixtures";

const routing = (o: string, d: string) => pathsFor(o, d).map((p) => [p.routes[0].origin, ...p.routes.map((r) => r.dest)].join("-"));

describe("paths", () => {
  it("routes spoke-to-spoke through a hub", () => {
    expect(routing("YXU", "YHZ")).toContain("YXU-YYZ-YHZ");
  });
  it("needs two hubs when the spokes share none", () => {
    const r = routing("YQB", "YKA");
    expect(r.every((x) => x.split("-").length === 4)).toBe(true);
    expect(r).toContain("YQB-YUL-YVR-YKA");
  });
  it("rejects silly short-haul and back-tracking connections", () => {
    expect(routing("YXU", "YQG")).toEqual([]); // ~170 km, no direct flight
    expect(routing("YOW", "BOS")).toEqual([]); // via YYZ is 2.3x the distance
  });
  it("keeps both hubs for long east-west trips", () => {
    expect(routing("YHZ", "YYC")).toEqual(expect.arrayContaining(["YHZ-YYZ-YYC", "YHZ-YUL-YYC"]));
  });
  it("lists reachable destinations", () => {
    expect(reachableFrom("YXU")).toEqual(expect.arrayContaining(["YVR", "CUN", "YHZ"]));
  });
});

describe("itinerary building", () => {
  const seats = 1;
  it("chains connections within minimum and maximum connecting time", () => {
    const a = leg("YXU", "YYZ", in30, "07:00", "DH4", 45); // arrives 07:45
    const tooTight = leg("YYZ", "YHZ", in30, "08:15", "32N", 120); // 30 min
    const ok = leg("YYZ", "YHZ", in30, "08:45", "32N", 120); // 60 min
    const tooLong = leg("YYZ", "YHZ", in30, "12:30", "32N", 120); // 4h45
    const its = buildItineraries({
      date: in30,
      seats,
      nowMs: NOW,
      today: TODAY,
      paths: pathsFor("YXU", "YHZ"),
      legsByRoute: byRoute([a, tooTight, ok, tooLong]),
    });
    expect(its.map((i) => i.legs.map((l) => l.id))).toEqual([[a.id, ok.id]]);
    expect(its[0].connections[0]).toMatchObject({ airport: "YYZ", minutes: 60 });
  });

  it("requires 75 minutes to connect to the U.S. (preclearance)", () => {
    const a = leg("YXU", "YYZ", in30, "07:00", "DH4", 60); // arr 08:00
    const b = leg("YYZ", "BOS", in30, "09:00", "E75", 90); // 60 min — too short for TB
    const c = leg("YYZ", "BOS", in30, "09:20", "E75", 90); // 80 min
    const its = buildItineraries({ date: in30, seats, nowMs: NOW, today: TODAY, paths: pathsFor("YXU", "BOS"), legsByRoute: byRoute([a, b, c]) });
    expect(its.map((i) => i.legs[1].id)).toEqual([c.id]);
  });

  it("drops dominated options and sorts by departure", () => {
    const d1 = leg("YYZ", "YUL", in30, "09:00", "E75", 65);
    const d2 = leg("YYZ", "YUL", in30, "07:00", "E75", 65);
    const its = buildItineraries({ date: in30, seats, nowMs: NOW, today: TODAY, paths: pathsFor("YYZ", "YUL"), legsByRoute: byRoute([d1, d2]) });
    expect(its.map((i) => i.legs[0].id)).toEqual([d2.id, d1.id]);
    expect(its[0].offers.BASIC.status).toBe("AVAILABLE");
    expect(its[0].offers.PREMIUM.status).toBe("NOT_OFFERED"); // E175 has no W cabin
  });

  it("does not sell departures that leave too soon", () => {
    const soon = leg("YYZ", "YUL", TODAY, "09:30", "E75", 65); // 30 min after NOW
    const later = leg("YYZ", "YUL", TODAY, "12:30", "E75", 65);
    const its = buildItineraries({ date: TODAY, seats, nowMs: NOW, today: TODAY, paths: pathsFor("YYZ", "YUL"), legsByRoute: byRoute([soon, later]) });
    expect(its.map((i) => i.legs[0].id)).toEqual([later.id]);
  });

  it("treats a full economy cabin as sold out for the party size", () => {
    const f = leg("YYZ", "YUL", in30, "09:00", "E75", 65);
    f.inv.Y!.sold = f.inv.Y!.capacity - 2;
    const run = (s: number) => buildItineraries({ date: in30, seats: s, nowMs: NOW, today: TODAY, paths: pathsFor("YYZ", "YUL"), legsByRoute: byRoute([f]) })[0];
    expect(run(2).offers.CLASSIC.status).toBe("AVAILABLE");
    expect(run(3).offers.CLASSIC.status).toBe("SOLD_OUT");
  });
});
