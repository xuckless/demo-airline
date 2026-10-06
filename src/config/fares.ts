import type { Cabin } from "./fleet";

export type BrandCode = "BASIC" | "CLASSIC" | "PREMIUM" | "BUSINESS";
export const BRAND_CODES: BrandCode[] = ["BASIC", "CLASSIC", "PREMIUM", "BUSINESS"];

export interface Perk {
  label: string;
  included: boolean;
}

export interface FareBrand {
  code: BrandCode;
  name: string;
  cabin: Cabin;
  displayOrder: number;
  tagline: string;
  bagsIncluded: number;
  seatSelection: "none" | "standard" | "any";
  changeFeeCents: number | null; // null = no changes
  refundable: boolean;
  /** Brand sold on segments whose aircraft lacks this brand's cabin (mixed cabin). */
  fallback: BrandCode | null;
  perks: Perk[];
}

export const FARE_BRANDS: FareBrand[] = [
  {
    code: "BASIC",
    name: "Basic",
    cabin: "Y",
    displayOrder: 1,
    tagline: "Just the seat",
    bagsIncluded: 0,
    seatSelection: "none",
    changeFeeCents: null,
    refundable: false,
    fallback: null,
    perks: [
      { label: "1 personal item", included: true },
      { label: "Carry-on bag", included: false },
      { label: "Seat assigned at check-in", included: true },
      { label: "Changes", included: false },
      { label: "Earn 10% points", included: true },
    ],
  },
  {
    code: "CLASSIC",
    name: "Classic",
    cabin: "Y",
    displayOrder: 2,
    tagline: "The sensible choice",
    bagsIncluded: 1,
    seatSelection: "standard",
    changeFeeCents: 7500,
    refundable: false,
    fallback: null,
    perks: [
      { label: "Carry-on + 1 checked bag", included: true },
      { label: "Standard seat selection", included: true },
      { label: "Changes for $75 + fare difference", included: true },
      { label: "Complimentary snacks & drinks", included: true },
      { label: "Earn 50% points", included: true },
    ],
  },
  {
    code: "PREMIUM",
    name: "Premium Economy",
    cabin: "W",
    displayOrder: 3,
    tagline: "More room, more comfort",
    bagsIncluded: 2,
    seatSelection: "any",
    changeFeeCents: 0,
    refundable: false,
    fallback: "CLASSIC",
    perks: [
      { label: "2 checked bags", included: true },
      { label: "Wider seat, extra legroom", included: true },
      { label: "Priority boarding", included: true },
      { label: "Free changes (fare difference applies)", included: true },
      { label: "Earn 100% points", included: true },
    ],
  },
  {
    code: "BUSINESS",
    name: "Business",
    cabin: "J",
    displayOrder: 4,
    tagline: "Our very best",
    bagsIncluded: 2,
    seatSelection: "any",
    changeFeeCents: 0,
    refundable: true,
    fallback: "PREMIUM",
    perks: [
      { label: "2 checked bags + priority handling", included: true },
      { label: "Lounge access", included: true },
      { label: "Priority check-in, security & boarding", included: true },
      { label: "Fully refundable, free changes", included: true },
      { label: "Earn 150% points", included: true },
    ],
  },
];

export const BRAND_BY_CODE = new Map(FARE_BRANDS.map((b) => [b.code, b]));

export interface FareBucket {
  brand: BrandCode;
  rbd: string;
  step: number;
  /** Bucket stays open while (sold + seats) / capacity <= lfMax. */
  lfMax: number;
  /** Bucket only sold at least this many days before departure. */
  minAdvDays: number;
  multiplier: number;
}

const ladder = (brand: BrandCode, rows: [string, number, number, number][]): FareBucket[] =>
  rows.map(([rbd, multiplier, lfMax, minAdvDays], step) => ({ brand, rbd, step, multiplier, lfMax, minAdvDays }));

export const FARE_BUCKETS: FareBucket[] = [
  ...ladder("BASIC", [
    ["G", 0.55, 0.45, 21],
    ["T", 0.62, 0.6, 14],
    ["L", 0.72, 0.72, 7],
    ["K", 0.85, 0.82, 3],
  ]),
  ...ladder("CLASSIC", [
    ["V", 0.8, 0.5, 14],
    ["Q", 0.92, 0.65, 7],
    ["M", 1.05, 0.8, 3],
    ["H", 1.25, 0.92, 0],
    ["Y", 1.6, 1.0, 0],
  ]),
  ...ladder("PREMIUM", [
    ["N", 1.0, 0.5, 14],
    ["E", 1.2, 0.8, 0],
    ["W", 1.5, 1.0, 0],
  ]),
  ...ladder("BUSINESS", [
    ["D", 1.0, 0.5, 14],
    ["C", 1.3, 0.85, 0],
    ["J", 1.7, 1.0, 0],
  ]),
];

export const LADDERS: Record<BrandCode, FareBucket[]> = {
  BASIC: FARE_BUCKETS.filter((b) => b.brand === "BASIC"),
  CLASSIC: FARE_BUCKETS.filter((b) => b.brand === "CLASSIC"),
  PREMIUM: FARE_BUCKETS.filter((b) => b.brand === "PREMIUM"),
  BUSINESS: FARE_BUCKETS.filter((b) => b.brand === "BUSINESS"),
};

/** Fare model knobs. */
export const CABIN_MULTIPLIER: Record<Cabin, number> = { Y: 1, W: 1.9, J: 3.4 };
export const LIE_FLAT_MULTIPLIER = 1.15;
export const CONNECTION_FACTOR = [1.0, 0.9, 0.82]; // by number of stops
/** Day-of-week demand factor, index 0 = Sunday (JS getUTCDay). */
export const DOW_FACTOR = [1.08, 1.0, 0.94, 0.94, 1.0, 1.08, 1.0];
export const INFANT_FEE_CENTS = 1000;
