import { airport, HUBS } from "@/config/airports";
import { BANKS, EARLIEST_DEP, INBOUND_WINDOW, LATEST_DEP, OUTBOUND_WINDOW } from "@/config/banks";
import { DAILY, NETWORK } from "@/config/network";
import { rngFor } from "../rng";
import { ROUTES, type Route } from "../network";
import { localToUtc, tzOffsetMinutes } from "../time";
import { blockMinutes } from "./block";
import type { Period } from "./periods";

export interface Schedule {
  flightNumber: number;
  routeId: number;
  aircraft: string;
  depLocalMin: number;
  blockMin: number;
  dowMask: number;
  effectiveFrom: string;
  effectiveTo: string;
  bankTag: string | null;
}

export function effectiveFreq(freq: number, scale: number) {
  return Math.max(1, Math.round(freq * scale));
}

interface Slot {
  dep: number;
  block: number;
  aircraft: string;
  tag: string | null;
}

const STEP = 5;
const range = (lo: number, hi: number) => Array.from({ length: Math.floor((hi - lo) / STEP) + 1 }, (_, i) => lo + i * STEP);
const mod = (m: number) => ((m % 1440) + 1440) % 1440;
const validDep = (t: number) => t >= EARLIEST_DEP && t <= LATEST_DEP;
/** Avoid arrivals between 00:30 and 05:30 unless it is a deliberate long-haul red-eye. */
const validArr = (arrLocal: number, block: number, dep: number) => {
  const m = mod(arrLocal);
  return !(m > 30 && m < 330) || (block > 240 && dep >= 21 * 60);
};

/** Bank indices spread evenly over the day: n=1 → middle bank, n=2 → 2nd & 4th of 5, … */
export function spreadBanks(n: number, banks: number): number[] {
  if (n >= banks) return Array.from({ length: banks }, (_, i) => i);
  return Array.from({ length: n }, (_, i) => Math.floor(((i + 0.5) * banks) / n));
}

function context(route: Route, period: Period) {
  const o = airport(route.origin);
  const d = airport(route.dest);
  const refUtc = localToUtc(period.ref, 12 * 60, "UTC");
  return { o, d, tzDelta: tzOffsetMinutes(d.tz, refUtc) - tzOffsetMinutes(o.tz, refUtc), westbound: d.lon < o.lon };
}

/** Off-bank filler: spread over the day, away from existing slots. */
function fillSlot(taken: Slot[], block: number, tzDelta: number, rng: () => number): number {
  let best = EARLIEST_DEP;
  let bestScore = -Infinity;
  for (const t of range(EARLIEST_DEP, LATEST_DEP)) {
    if (!validArr(t + block + tzDelta, block, t)) continue;
    const nearest = taken.length ? Math.min(...taken.map((s) => Math.abs(s.dep - t))) : 600;
    const score = Math.min(nearest, 240) + rng();
    if (score > bestScore) [best, bestScore] = [t, score];
  }
  return best;
}

/**
 * Hub ↔ spoke: each frequency is timed into a connecting bank at the hub —
 * arriving 15–45 min before the bank pivot, or leaving 30–60 min after it.
 */
function spokeSlots(route: Route, aircraft: string[], n: number, period: Period): Slot[] {
  const { o, d, tzDelta, westbound } = context(route, period);
  const fromHub = HUBS.includes(o.iata);
  const hub = fromHub ? o.iata : d.iata;
  const pivots = BANKS[hub];
  const rng = rngFor("spoke", route.id, n);
  const prefer = spreadBanks(n, pivots.length);
  const used = new Set<number>();
  const slots: Slot[] = [];
  for (let i = 0; i < n; i++) {
    const ac = aircraft[i % aircraft.length];
    const block = blockMinutes(route.distanceKm, ac, westbound);
    const first = prefer[i];
    const order = first === undefined ? [] : [...pivots.keys()].filter((b) => !used.has(b)).sort((a, b) => Math.abs(a - first) - Math.abs(b - first));
    let placed: Slot | null = null;
    for (const b of order) {
      const p = pivots[b];
      // Candidate times in origin-local minutes.
      // U.S.-bound departures leave later in the bank to allow for preclearance.
      const win = fromHub && d.country === "US" ? ([60, 90] as const) : OUTBOUND_WINDOW;
      const cands = fromHub
        ? range(p + win[0], p + win[1])
        : range(p + INBOUND_WINDOW[0], p + INBOUND_WINDOW[1]).map((arr) => arr - block - tzDelta);
      const ok = cands.filter((t) => validDep(t) && validArr(t + block + tzDelta, block, t));
      if (!ok.length) continue;
      const dep = ok[Math.floor(rng() * ok.length)];
      placed = { dep, block, aircraft: ac, tag: `${hub}-B${b + 1}-${fromHub ? "OUT" : "IN"}` };
      used.add(b);
      break;
    }
    slots.push(placed ?? { dep: fillSlot(slots, block, tzDelta, rng), block, aircraft: ac, tag: null });
  }
  return slots;
}

/** Hub ↔ hub: prefer departures that leave in an origin bank AND land in a destination bank. */
function trunkSlots(route: Route, aircraft: string[], n: number, period: Period): Slot[] {
  const { o, d, tzDelta, westbound } = context(route, period);
  const rng = rngFor("trunk", route.id, n);
  const slots: Slot[] = [];
  const usedOut = new Set<number>();
  const usedIn = new Set<number>();
  for (let i = 0; i < n; i++) {
    const ac = aircraft[i % aircraft.length];
    const block = blockMinutes(route.distanceKm, ac, westbound);
    let best: { dep: number; score: number; tag: string | null } = { dep: -1, score: -Infinity, tag: null };
    for (const t of range(EARLIEST_DEP, LATEST_DEP)) {
      const arr = t + block + tzDelta;
      if (!validArr(arr, block, t) || slots.some((s) => Math.abs(s.dep - t) < 40)) continue;
      const bo = BANKS[o.iata].findIndex((p) => t >= p + OUTBOUND_WINDOW[0] && t <= p + OUTBOUND_WINDOW[1]);
      const bi = BANKS[d.iata].findIndex((p) => mod(arr) >= p + INBOUND_WINDOW[0] && mod(arr) <= p + INBOUND_WINDOW[1]);
      let score = rng() * 0.5;
      if (bo >= 0) score += usedOut.has(bo) ? 1 : 4;
      if (bi >= 0) score += usedIn.has(bi) ? 1 : 4;
      if (score > best.score) {
        const tag = [bo >= 0 ? `${o.iata}-B${bo + 1}-OUT` : null, bi >= 0 ? `${d.iata}-B${bi + 1}-IN` : null].filter(Boolean).join("/") || null;
        best = { dep: t, score, tag };
      }
    }
    const bo = BANKS[o.iata].findIndex((p) => best.dep >= p + OUTBOUND_WINDOW[0] && best.dep <= p + OUTBOUND_WINDOW[1]);
    const bi = BANKS[d.iata].findIndex((p) => {
      const a = mod(best.dep + block + tzDelta);
      return a >= p + INBOUND_WINDOW[0] && a <= p + INBOUND_WINDOW[1];
    });
    if (bo >= 0) usedOut.add(bo);
    if (bi >= 0) usedIn.add(bi);
    slots.push({ dep: best.dep, block, aircraft: ac, tag: best.tag });
  }
  return slots;
}

function pickSlots(route: Route, aircraft: string[], n: number, period: Period): Slot[] {
  const slots = route.kind === "TRUNK" ? trunkSlots(route, aircraft, n, period) : spokeSlots(route, aircraft, n, period);
  return slots.sort((x, y) => x.dep - y.dep);
}

type Group = "TRUNK" | "YYZ" | "YUL" | "YVR" | "INTL";
const GROUP_START: Record<Group, number> = { TRUNK: 100, YYZ: 200, YUL: 600, YVR: 800, INTL: 1000 };

function groupOf(a: string, b: string): Group {
  if (HUBS.includes(a) && HUBS.includes(b)) return "TRUNK";
  if (airport(b).region !== "CA") return "INTL";
  return a as Group;
}

/**
 * Flight-number blocks per route: odd numbers fly away from the hub (a -> b),
 * even numbers fly back, both rising through the day. Deterministic by config order.
 */
export function flightNumberBases(scale: number): number[] {
  const next = { ...GROUP_START };
  return NETWORK.map((e) => {
    const g = groupOf(e.a, e.b);
    const base = next[g];
    const n = effectiveFreq(e.freq, scale);
    next[g] = Math.ceil((base + 2 * n + 2) / 10) * 10;
    return base;
  });
}

export function generateSchedules(periods: Period[], scale: number): Schedule[] {
  const bases = flightNumberBases(scale);
  const out: Schedule[] = [];
  for (const period of periods) {
    NETWORK.forEach((e, i) => {
      const n = effectiveFreq(e.freq, scale);
      const aircraft = Array.isArray(e.aircraft) ? e.aircraft : [e.aircraft];
      for (const route of ROUTES.filter((r) => r.entryIndex === i)) {
        const slots = pickSlots(route, aircraft, n, period);
        slots.forEach((s, k) => {
          out.push({
            flightNumber: bases[i] + (route.direction === "OUT" ? 2 * k + 1 : 2 * k + 2),
            routeId: route.id,
            aircraft: s.aircraft,
            depLocalMin: s.dep,
            blockMin: s.block,
            dowMask: e.dowMask ?? DAILY,
            effectiveFrom: period.from,
            effectiveTo: period.to,
            bankTag: s.tag,
          });
        });
      }
    });
  }
  return out;
}
