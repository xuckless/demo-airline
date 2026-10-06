import { brand } from "@/config/brand";
import { airport } from "@/config/airports";
import { hhmm, utcToLocal } from "@/domain/time";

const money = new Intl.NumberFormat(brand.locale, { style: "currency", currency: brand.currency, maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat(brand.locale, { style: "currency", currency: brand.currency, minimumFractionDigits: 2 });

export const fmtMoney = (cents: number) => money.format(Math.round(cents / 100));
export const fmtMoneyExact = (cents: number) => money2.format(cents / 100);

/** Local clock time at an airport, e.g. "07:45". */
export const fmtTime = (ms: number, iata: string) => hhmm(utcToLocal(ms, airport(iata).tz).minutes);

export function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** "+1" style day offset of local arrival vs local departure date. */
export function dayOffset(depMs: number, depIata: string, arrMs: number, arrIata: string) {
  const d = utcToLocal(depMs, airport(depIata).tz).date;
  const a = utcToLocal(arrMs, airport(arrIata).tz).date;
  return Math.round((Date.parse(a) - Date.parse(d)) / 86_400_000);
}

const dateFmt = new Intl.DateTimeFormat(brand.locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const dateLong = new Intl.DateTimeFormat(brand.locale, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const dayNum = new Intl.DateTimeFormat(brand.locale, { day: "numeric", timeZone: "UTC" });
const wkday = new Intl.DateTimeFormat(brand.locale, { weekday: "short", timeZone: "UTC" });
const mon = new Intl.DateTimeFormat(brand.locale, { month: "short", timeZone: "UTC" });

const d = (s: string) => new Date(s + "T00:00:00Z");
export const fmtDate = (s: string) => dateFmt.format(d(s));
export const fmtDateLong = (s: string) => dateLong.format(d(s));
export const fmtDayParts = (s: string) => ({ weekday: wkday.format(d(s)), day: dayNum.format(d(s)), month: mon.format(d(s)) });

export const flightNo = (n: number) => `${brand.airlineCode} ${n}`;
