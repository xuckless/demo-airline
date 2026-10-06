import { TZDate } from "@date-fns/tz";

/** Calendar dates are plain "YYYY-MM-DD" strings; instants are UTC epoch ms. */
export type DateStr = string;

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDateStr = (s: string): s is DateStr => DATE_RE.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

const parts = (d: DateStr) => d.split("-").map(Number) as [number, number, number];

export function addDays(d: DateStr, n: number): DateStr {
  const [y, m, day] = parts(d);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

/** Whole days from b to a (a - b). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / DAY);
}

/** ISO weekday, Mon=1 .. Sun=7. */
export function isoDow(d: DateStr): number {
  const js = new Date(d + "T00:00:00Z").getUTCDay();
  return js === 0 ? 7 : js;
}

/** JS weekday, Sun=0 .. Sat=6. */
export function jsDow(d: DateStr): number {
  return new Date(d + "T00:00:00Z").getUTCDay();
}

/** UTC instant for a local wall-clock time (minutes after midnight) on a date in a zone. */
export function localToUtc(d: DateStr, minutes: number, tz: string): number {
  const [y, m, day] = parts(d);
  return new TZDate(y, m - 1, day, Math.floor(minutes / 60), minutes % 60, tz).getTime();
}

export const startOfLocalDay = (d: DateStr, tz: string) => localToUtc(d, 0, tz);

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export interface LocalTime {
  date: DateStr;
  minutes: number;
}

export function utcToLocal(ms: number, tz: string): LocalTime {
  const p: Record<string, string> = {};
  for (const x of fmt(tz).formatToParts(new Date(ms))) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

export const localDate = (ms: number, tz: string): DateStr => utcToLocal(ms, tz).date;

/** UTC offset (minutes) of a zone at an instant. */
export function tzOffsetMinutes(tz: string, ms: number): number {
  const l = utcToLocal(ms, tz);
  const asUtc = Date.parse(l.date + "T00:00:00Z") + l.minutes * MINUTE;
  return Math.round((asUtc - Math.floor(ms / MINUTE) * MINUTE) / MINUTE);
}

export const hhmm = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export const parseHhmm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
