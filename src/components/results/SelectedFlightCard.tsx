import Link from "next/link";
import { BRAND_BY_CODE, type BrandCode } from "@/config/fares";
import type { LegDTO } from "./types";

export function SelectedFlightCard({
  title,
  legs,
  brand,
  price,
  stops,
  changeHref,
  cabinNote,
}: {
  title: string;
  legs: LegDTO[];
  brand: BrandCode;
  price: string;
  stops: string;
  changeHref?: string;
  cabinNote?: string | null;
}) {
  const first = legs[0];
  const last = legs[legs.length - 1];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
        {changeHref && (
          <Link href={changeHref} className="text-xs font-medium text-navy-700 hover:underline">
            Change
          </Link>
        )}
      </div>
      <p className="mt-1 font-semibold text-navy-900">
        {first.originCity} → {last.destCity}
      </p>
      <p className="text-sm text-slate-600">
        {first.date} · {first.depTime} – {last.arrTime}
        {last.arrDayOffset > 0 && <sup className="text-rose-600">+{last.arrDayOffset}</sup>}
      </p>
      <p className="text-xs text-slate-500">
        {stops} · {legs.map((l) => l.flightNo).join(", ")}
      </p>
      {cabinNote && <p className="mt-1 text-xs text-amber-700">{cabinNote}</p>}
      <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
        <span className="font-medium">{BRAND_BY_CODE.get(brand)!.name}</span>
        <span className="font-semibold text-navy-900">{price}</span>
      </div>
    </div>
  );
}
