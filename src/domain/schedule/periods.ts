import { AIRPORTS } from "@/config/airports";
import { addDays, type DateStr, localToUtc, tzOffsetMinutes } from "../time";

export interface Period {
  from: DateStr;
  to: DateStr;
  /** Date used to resolve UTC offsets for the whole period. */
  ref: DateStr;
}

const ZONES = [...new Set(AIRPORTS.map((a) => a.tz))];

function signature(d: DateStr) {
  const noon = localToUtc(d, 12 * 60, "UTC");
  return ZONES.map((z) => tzOffsetMinutes(z, noon)).join(",");
}

/**
 * Split [from, to] wherever any network time zone changes its UTC offset, so
 * each schedule period keeps hub banks aligned (like IATA seasons, but exact).
 */
export function offsetPeriods(from: DateStr, to: DateStr): Period[] {
  const out: Period[] = [];
  let start = from;
  let sig = signature(from);
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) {
    const s = signature(d);
    if (s !== sig) {
      out.push({ from: start, to: addDays(d, -1), ref: start });
      start = d;
      sig = s;
    }
  }
  out.push({ from: start, to, ref: start });
  return out;
}
