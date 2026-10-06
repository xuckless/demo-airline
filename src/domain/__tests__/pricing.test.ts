import { describe, expect, it } from "vitest";
import { LADDERS } from "@/config/fares";
import { lowestOpenBucket } from "../pricing/rm";
import { baseEconomyDollars, journeyFare } from "../pricing/fare";
import { taxesPerSeat } from "../pricing/taxes";
import { priceBrand } from "../pricing/offer";
import { quoteTrip } from "../pricing/quote";
import { leg, TODAY, in30 } from "./fixtures";

const inv = (capacity: number, sold: number) => ({ capacity, sold });

describe("revenue management", () => {
  it("opens the cheapest bucket only within load-factor and advance-purchase limits", () => {
    expect(lowestOpenBucket(LADDERS.BASIC, inv(100, 0), 1, 30)?.bucket.rbd).toBe("G");
    expect(lowestOpenBucket(LADDERS.BASIC, inv(100, 45), 1, 30)?.bucket.rbd).toBe("T");
    expect(lowestOpenBucket(LADDERS.BASIC, inv(100, 0), 1, 10)?.bucket.rbd).toBe("L");
    expect(lowestOpenBucket(LADDERS.BASIC, inv(100, 0), 1, 2)).toBeNull(); // Basic closes inside 3 days
    expect(lowestOpenBucket(LADDERS.BASIC, inv(100, 82), 1, 30)).toBeNull(); // and above 82% full
    expect(lowestOpenBucket(LADDERS.CLASSIC, inv(100, 99), 1, 0)?.bucket.rbd).toBe("Y");
    expect(lowestOpenBucket(LADDERS.CLASSIC, inv(100, 100), 1, 5)).toBeNull();
  });

  it("never gets cheaper as the flight fills or departure approaches", () => {
    for (const brand of ["BASIC", "CLASSIC", "PREMIUM", "BUSINESS"] as const) {
      for (const days of [0, 2, 5, 10, 20, 40]) {
        let prev = 0;
        for (let sold = 0; sold < 100; sold += 5) {
          const b = lowestOpenBucket(LADDERS[brand], inv(100, sold), 1, days);
          if (!b) break;
          expect(b.bucket.multiplier).toBeGreaterThanOrEqual(prev);
          prev = b.bucket.multiplier;
        }
      }
    }
  });

  it("always prices Classic above Basic when both are open", () => {
    for (const days of [3, 5, 8, 15, 25, 60]) {
      for (let sold = 0; sold <= 82; sold += 2) {
        const b = lowestOpenBucket(LADDERS.BASIC, inv(100, sold), 1, days);
        const c = lowestOpenBucket(LADDERS.CLASSIC, inv(100, sold), 1, days);
        if (b && c) expect(c.bucket.multiplier).toBeGreaterThan(b.bucket.multiplier);
      }
    }
  });
});

describe("fares", () => {
  it("scales with distance", () => {
    expect(baseEconomyDollars(350)).toBeGreaterThan(80);
    expect(baseEconomyDollars(350)).toBeLessThan(95);
    expect(baseEconomyDollars(3350)).toBeGreaterThan(baseEconomyDollars(1500));
  });

  it("discounts connections and allocates the rounded total across segments", () => {
    const bucket = LADDERS.CLASSIC[2];
    const direct = journeyFare(1000, [{ distanceKm: 1000, cabin: "Y", aircraft: "32N", bucket }], "2026-11-03");
    const conn = journeyFare(
      1000,
      [
        { distanceKm: 600, cabin: "Y", aircraft: "32N", bucket },
        { distanceKm: 550, cabin: "Y", aircraft: "32N", bucket },
      ],
      "2026-11-03",
    );
    expect(conn.totalCents).toBeLessThan(direct.totalCents);
    expect(conn.segmentCents.reduce((a, b) => a + b, 0)).toBe(conn.totalCents);
    expect(direct.totalCents % 1000).toBe(900); // retail "$x9"
  });
});

describe("taxes", () => {
  it("charges HST by Ontario origin on domestic trips", () => {
    const lines = taxesPerSeat("YYZ", "YOW", [], 10000);
    expect(lines.find((l) => l.code === "GST")).toMatchObject({ cents: 1300, label: "HST (13%)" });
    expect(lines.find((l) => l.code === "AIF")?.cents).toBe(3500);
  });
  it("adds U.S. and foreign lump sums, no GST on transborder/international", () => {
    expect(taxesPerSeat("YYZ", "BOS", [], 10000).map((l) => l.code)).toEqual(["AIF", "ATSC", "US"]);
    expect(taxesPerSeat("YUL", "CUN", [], 10000).map((l) => l.code)).toEqual(["AIF", "ATSC", "INTL"]);
    expect(taxesPerSeat("YXU", "YHZ", ["YYZ"], 10000).some((l) => l.code === "AIFC")).toBe(true);
  });
  it("charges lap infants a flat fee and no taxes", () => {
    const l = leg("YYZ", "YOW", in30, "09:30");
    const offer = priceBrand([l], "CLASSIC", 1, TODAY);
    const one = quoteTrip([{ legs: [l], offer }], { adults: 1, children: 0, infants: 0 });
    const withInf = quoteTrip([{ legs: [l], offer }], { adults: 1, children: 0, infants: 1 });
    expect(withInf.taxCents).toBe(one.taxCents);
    expect(withInf.totalCents - one.totalCents).toBe(1000);
  });
});

describe("brand offers", () => {
  it("marks business mixed-cabin over a Dash 8 leg and not offered when the long leg lacks it", () => {
    const a = leg("YXU", "YYZ", in30, "07:00", "DH4");
    const b = leg("YYZ", "YVR", in30, "09:30", "789");
    const biz = priceBrand([a, b], "BUSINESS", 1, TODAY);
    expect(biz.status).toBe("AVAILABLE");
    expect(biz.mixed).toBe(true);
    expect(biz.segments.map((s) => s.cabin)).toEqual(["Y", "J"]);

    const c = leg("YYZ", "YSB", in30, "12:00", "DH4");
    expect(priceBrand([c], "BUSINESS", 1, TODAY).status).toBe("NOT_OFFERED");
    expect(priceBrand([c], "PREMIUM", 1, TODAY).status).toBe("NOT_OFFERED");
  });
  it("sells out when the cabin is full", () => {
    const full = leg("YYZ", "YOW", in30, "09:30", "E75", undefined, 1);
    expect(priceBrand([full], "CLASSIC", 1, TODAY).status).toBe("SOLD_OUT");
  });
});
