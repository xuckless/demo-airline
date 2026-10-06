import Link from "next/link";
import type { StripDay } from "@/server/search";
import { fmtDayParts, fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DateStrip({ days, selected, hrefFor }: { days: StripDay[]; selected: string; hrefFor: (d: string) => string }) {
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {days.map((d) => {
        const p = fmtDayParts(d.date);
        const active = d.date === selected;
        return (
          <Link
            key={d.date}
            href={hrefFor(d.date)}
            scroll={false}
            className={cn(
              "flex flex-col items-center border-r px-1 py-3 text-center transition last:border-r-0",
              active ? "bg-navy-900 text-white" : "hover:bg-sky-50",
            )}
          >
            <span className={cn("text-xs", active ? "text-white/70" : "text-slate-500")}>{p.weekday}</span>
            <span className="text-sm font-semibold">
              {p.month} {p.day}
            </span>
            <span className={cn("mt-1 text-xs font-medium sm:text-sm", active ? "text-gold-400" : d.lowestCents ? "text-navy-700" : "text-slate-400")}>
              {d.lowestCents ? fmtMoney(d.lowestCents) : "—"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
