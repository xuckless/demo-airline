import { Pencil } from "lucide-react";
import { BookingWidget } from "@/components/booking-widget/BookingWidget";
import { paxLabel } from "@/lib/pax";
import { airport } from "@/config/airports";
import { fmtDate } from "@/lib/format";
import type { TripSearch } from "@/lib/searchParams";
import { widgetProps } from "@/server/widget";

export function SearchSummary({ s, open = false }: { s: TripSearch; open?: boolean }) {
  const w = widgetProps();
  return (
    <details open={open} className="group rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-navy-900">
          {airport(s.from).city} ({s.from}) {s.trip === "RT" ? "⇄" : "→"} {airport(s.to).city} ({s.to})
        </span>
        <span className="text-slate-500">
          {fmtDate(s.depart)}
          {s.trip === "RT" && s.return ? ` – ${fmtDate(s.return)}` : " · One way"}
        </span>
        <span className="text-slate-500">{paxLabel({ adt: s.adt, chd: s.chd, inf: s.inf })}</span>
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-navy-700">
          <Pencil className="size-3.5" /> <span className="group-open:hidden">Modify search</span>
          <span className="hidden group-open:inline">Close</span>
        </span>
      </summary>
      <div className="border-t p-3">
        <BookingWidget
          compact
          airports={w.airports}
          reachable={w.reachable}
          minDate={w.minDate}
          maxDate={w.maxDate}
          defaults={{ trip: s.trip, from: s.from, to: s.to, depart: s.depart, return: s.return, adt: s.adt, chd: s.chd, inf: s.inf }}
        />
      </div>
    </details>
  );
}
