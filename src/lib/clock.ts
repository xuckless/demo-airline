import { brand } from "@/config/brand";
import { addDays, DAY, type DateStr, diffDays, isDateStr, localDate } from "@/domain/time";

/**
 * Demo clock. DEMO_TODAY=YYYY-MM-DD shifts "now" by whole days so the demo can
 * time-travel (e.g. to test the rolling window) while keeping time of day.
 */
export function nowMs(): number {
  const real = Date.now();
  const demo = process.env.DEMO_TODAY;
  if (demo && isDateStr(demo)) return real + diffDays(demo, localDate(real, brand.homeTimeZone)) * DAY;
  return real;
}

export const today = (): DateStr => localDate(nowMs(), brand.homeTimeZone);
export const todayPlus = (n: number) => addDays(today(), n);
