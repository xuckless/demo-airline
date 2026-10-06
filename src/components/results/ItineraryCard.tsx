"use client";

import { Check, ChevronDown, Clock, Plane, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BRAND_BY_CODE, type BrandCode } from "@/config/fares";
import { cn } from "@/lib/utils";
import type { ItinDTO, OfferDTO } from "./types";

function PriceCell({ offer, active, onClick }: { offer: OfferDTO; active: boolean; onClick: () => void }) {
  if (offer.status !== "AVAILABLE") {
    return (
      <div className="flex h-full min-h-20 items-center justify-center rounded-xl bg-slate-50 px-2 text-center text-xs text-slate-400">
        {offer.status === "SOLD_OUT" ? "Sold out" : "Not offered"}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cn(
        "flex h-full min-h-20 w-full flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition",
        active ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white hover:border-navy-600 hover:bg-sky-50",
      )}
    >
      <span className={cn("text-[11px]", active ? "text-white/70" : "text-slate-500")}>from</span>
      <span className="text-lg font-bold">{offer.price}</span>
      {offer.seatsLeft <= 5 ? (
        <span className={cn("text-[11px] font-medium", active ? "text-gold-400" : "text-rose-600")}>
          {offer.seatsLeft} left at this price
        </span>
      ) : offer.mixed ? (
        <span className={cn("text-[11px]", active ? "text-white/70" : "text-slate-500")}>Mixed cabin</span>
      ) : null}
    </button>
  );
}

function BrandCard({ offer, highlighted }: { offer: OfferDTO; highlighted: boolean }) {
  const brand = BRAND_BY_CODE.get(offer.brand)!;
  const available = offer.status === "AVAILABLE";
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-white p-4",
        highlighted ? "border-navy-900 ring-2 ring-navy-900/10" : "border-slate-200",
        !available && "opacity-60",
      )}
    >
      <p className="text-xs font-semibold tracking-wider text-gold-500 uppercase">{brand.tagline}</p>
      <p className="text-lg font-semibold text-navy-900">{brand.name}</p>
      {offer.cabinNote && <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{offer.cabinNote}</p>}
      <ul className="mt-3 flex-1 space-y-1.5 text-sm">
        {brand.perks.map((p) => (
          <li key={p.label} className="flex gap-2">
            {p.included ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <X className="mt-0.5 size-4 shrink-0 text-slate-400" />}
            <span className={p.included ? "text-slate-700" : "text-slate-400"}>{p.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t pt-3">
        {available ? (
          <>
            <p className="text-2xl font-bold text-navy-900">{offer.price}</p>
            <p className="text-xs text-slate-500">per passenger, before taxes · fare class {offer.rbds}</p>
            <Link
              href={offer.href}
              className="mt-3 flex h-10 items-center justify-center rounded-lg bg-gold-400 font-semibold text-navy-950 transition hover:bg-gold-500"
            >
              Select {brand.name}
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-500">{offer.status === "SOLD_OUT" ? "Sold out on this flight" : "Not offered on this flight"}</p>
        )}
      </div>
    </div>
  );
}

export function ItineraryCard({ it }: { it: ItinDTO }) {
  const [open, setOpen] = useState<BrandCode | null>(null);
  const [details, setDetails] = useState(false);
  const firstAvailable = it.offers.find((o) => o.status === "AVAILABLE");

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_minmax(0,1.5fr)] lg:items-center">
        <div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-navy-900">{it.depTime}</p>
              <p className="text-sm font-medium text-slate-500">{it.origin}</p>
            </div>
            <div className="flex flex-1 flex-col items-center px-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="size-3" /> {it.duration}
              </span>
              <span className="relative my-1 h-px w-full bg-slate-300">
                {it.connections.map((c, i) => (
                  <span
                    key={c.airport}
                    className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-white bg-gold-500"
                    style={{ left: `${((i + 1) / (it.connections.length + 1)) * 100}%` }}
                  />
                ))}
                <Plane className="absolute top-1/2 -right-1 size-3.5 -translate-y-1/2 text-navy-700" />
              </span>
              <span className={it.nonstop ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>{it.stopsLabel}</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-navy-900">
                {it.arrTime}
                {it.arrDayOffset > 0 && <sup className="ml-0.5 text-xs text-rose-600">+{it.arrDayOffset}</sup>}
              </p>
              <p className="text-sm font-medium text-slate-500">{it.dest}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{it.legs.map((l) => l.flightNo).join(" · ")}</span>
            <span>{[...new Set(it.legs.map((l) => l.aircraft))].join(" + ")}</span>
            <button type="button" onClick={() => setDetails((d) => !d)} className="inline-flex items-center gap-0.5 font-medium text-navy-700 hover:underline">
              Flight details <ChevronDown className={cn("size-3.5 transition", details && "rotate-180")} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {it.offers.map((o) => (
            <PriceCell key={o.brand} offer={o} active={open === o.brand} onClick={() => setOpen(open === o.brand ? null : o.brand)} />
          ))}
        </div>
      </div>

      {details && (
        <div className="border-t bg-slate-50/60 px-4 py-4 sm:px-5">
          <ol className="space-y-3">
            {it.legs.map((l, i) => (
              <li key={l.flightNo + i}>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span className="size-2.5 rounded-full bg-navy-900" />
                    <span className="w-px flex-1 bg-slate-300" />
                    <span className="size-2.5 rounded-full border-2 border-navy-900 bg-white" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p>
                      <span className="font-semibold tabular-nums">{l.depTime}</span> {l.originCity} ({l.origin})
                    </p>
                    <p className="my-1 text-xs text-slate-500">
                      {l.flightNo} · {l.aircraft} · {l.duration} · {l.date}
                    </p>
                    <p>
                      <span className="font-semibold tabular-nums">{l.arrTime}</span>
                      {l.arrDayOffset > 0 && <sup className="text-rose-600">+{l.arrDayOffset}</sup>} {l.destCity} ({l.dest})
                    </p>
                  </div>
                </div>
                {it.connections[i] && (
                  <p className="my-2 ml-6 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                    Connection in {it.connections[i].city} ({it.connections[i].airport}) · {it.connections[i].duration}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {open && (
        <div className="border-t bg-sky-50/60 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {it.offers.map((o) => (
              <BrandCard key={o.brand} offer={o} highlighted={o.brand === open} />
            ))}
          </div>
        </div>
      )}
      {!open && !firstAvailable && <p className="border-t bg-slate-50 px-5 py-2 text-xs text-slate-500">This flight is sold out.</p>}
    </article>
  );
}
