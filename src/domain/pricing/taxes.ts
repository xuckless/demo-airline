import { airport } from "@/config/airports";
import { INFANT_FEE_CENTS } from "@/config/fares";
import {
  ATSC_CENTS,
  CONNECTING_AIF_CENTS,
  FOREIGN_TAXES_CENTS,
  SALES_TAX_NAME,
  SALES_TAX_RATE,
  US_TAXES_CENTS,
} from "@/config/taxes";
import { marketOf } from "../network";

export interface TaxLine {
  code: string;
  label: string;
  cents: number;
}

/** Taxes & fees per seated passenger for one direction of travel. */
export function taxesPerSeat(origin: string, dest: string, connections: string[], baseCents: number): TaxLine[] {
  const o = airport(origin);
  const d = airport(dest);
  const lines: TaxLine[] = [];
  if (o.aifCents > 0) lines.push({ code: "AIF", label: `Airport improvement fee (${o.iata})`, cents: o.aifCents });
  for (const c of connections) {
    if (airport(c).country === "CA") lines.push({ code: "AIFC", label: `Connecting airport fee (${c})`, cents: CONNECTING_AIF_CENTS });
  }
  if (o.country === "CA") {
    const m = marketOf(origin, dest);
    lines.push({ code: "ATSC", label: "Air travellers security charge", cents: ATSC_CENTS[m] });
  }
  if (o.country === "CA" && d.country === "CA" && o.province) {
    const rate = SALES_TAX_RATE[o.province] ?? 0.05;
    const name = SALES_TAX_NAME[o.province] ?? "GST";
    lines.push({ code: "GST", label: `${name} (${Math.round(rate * 100)}%)`, cents: Math.round(baseCents * rate) });
  }
  if (o.country === "US" || d.country === "US") lines.push({ code: "US", label: "U.S. taxes & fees", cents: US_TAXES_CENTS });
  if (!["CA", "US"].includes(o.country) || !["CA", "US"].includes(d.country)) {
    lines.push({ code: "INTL", label: "Foreign taxes & fees", cents: FOREIGN_TAXES_CENTS });
  }
  return lines;
}

export const infantFeeCents = () => INFANT_FEE_CENTS;
