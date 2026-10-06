import { z } from "zod";
import { BRAND_CODES, type BrandCode } from "@/config/fares";
import { seedConfig } from "@/config/seed";
import { SERVED } from "@/domain/network";
import { addDays, isDateStr } from "@/domain/time";

const served = new Set(SERVED.map((a) => a.iata));
const iata = z.string().toUpperCase().refine((s) => served.has(s), "Unknown airport");
const dateStr = z.string().refine(isDateStr, "Invalid date");
const int = (min: number, max: number, def: number) => z.coerce.number().int().min(min).max(max).catch(def);

export interface Selection {
  flightIds: number[];
  brand: BrandCode;
}

const SEL_RE = new RegExp(`^(\\d+(?:-\\d+){0,2})\\.(${BRAND_CODES.join("|")})$`);

export function parseSelection(s: string | undefined): Selection | null {
  const m = s ? SEL_RE.exec(s) : null;
  return m ? { flightIds: m[1].split("-").map(Number), brand: m[2] as BrandCode } : null;
}
export const formatSelection = (flightIds: number[], brand: BrandCode) => `${flightIds.join("-")}.${brand}`;

export const tripSearchSchema = z
  .object({
    trip: z.enum(["RT", "OW"]).catch("RT"),
    from: iata,
    to: iata,
    depart: dateStr,
    return: dateStr.optional(),
    adt: int(1, 9, 1),
    chd: int(0, 8, 0),
    inf: int(0, 9, 0),
    sort: z.enum(["dep", "duration", "price"]).catch("dep"),
    out: z.string().optional(),
    ret: z.string().optional(),
  })
  .refine((v) => v.from !== v.to, { message: "Origin and destination must differ", path: ["to"] })
  .refine((v) => v.adt + v.chd <= 9, { message: "At most 9 seated passengers", path: ["adt"] })
  .refine((v) => v.inf <= v.adt, { message: "Each infant must travel on an adult's lap", path: ["inf"] })
  .refine((v) => v.trip === "OW" || (v.return !== undefined && v.return >= v.depart), {
    message: "Return date must be on or after departure",
    path: ["return"],
  });

export type TripSearch = z.infer<typeof tripSearchSchema>;

export function validateDates(s: TripSearch, today: string): string | null {
  const max = addDays(today, seedConfig.horizonDays);
  if (s.depart < today) return "Departure date is in the past.";
  if (s.depart > max || (s.return && s.return > max)) return `Flights are on sale until ${max}.`;
  return null;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseTripSearch(raw: Raw) {
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, first(v)]));
  return tripSearchSchema.safeParse(flat);
}

/** Serialize a search (plus optional overrides) to a query string. */
export function tripQuery(s: Partial<TripSearch>, overrides: Partial<Record<keyof TripSearch, string | number | undefined>> = {}) {
  const merged: Record<string, string | number | undefined> = { ...s, ...overrides };
  if (merged.trip === "OW") merged.return = undefined;
  const p = new URLSearchParams();
  for (const k of ["trip", "from", "to", "depart", "return", "adt", "chd", "inf", "sort", "out", "ret"]) {
    const v = merged[k];
    if (v !== undefined && v !== "" && !(k === "sort" && v === "dep")) p.set(k, String(v));
  }
  return p.toString();
}
