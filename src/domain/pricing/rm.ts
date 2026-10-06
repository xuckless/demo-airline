import type { FareBucket } from "@/config/fares";
import type { CabinInv } from "../types";

export interface OpenBucket {
  bucket: FareBucket;
  /** Seats that can still be sold at this bucket's price. */
  seatsLeft: number;
}

/** Authorization level: seats sellable up to and including this bucket. */
export const authorized = (b: FareBucket, capacity: number) => Math.floor(b.lfMax * capacity + 1e-9);

/**
 * Nested-bucket revenue management: the cheapest bucket whose load-factor
 * ceiling still fits the party and whose advance-purchase rule is met.
 */
export function lowestOpenBucket(ladder: FareBucket[], inv: CabinInv, seats: number, daysOut: number): OpenBucket | null {
  if (daysOut < 0) return null;
  for (const b of ladder) {
    if (daysOut < b.minAdvDays) continue;
    const auth = authorized(b, inv.capacity);
    if (inv.sold + seats <= auth) return { bucket: b, seatsLeft: auth - inv.sold };
  }
  return null;
}
