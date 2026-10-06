"use client";

import { ArrowLeftRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AirportCombobox } from "./AirportCombobox";
import { DatePicker } from "./DatePicker";
import { PaxPicker } from "./PaxPicker";
import type { AirportOption, WidgetDefaults } from "./types";

export function BookingWidget({
  airports,
  reachable,
  minDate,
  maxDate,
  defaults,
  compact = false,
}: {
  airports: AirportOption[];
  reachable: Record<string, string[]>;
  minDate: string;
  maxDate: string;
  defaults: WidgetDefaults;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [trip, setTrip] = useState(defaults.trip);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [depart, setDepart] = useState(defaults.depart);
  const [ret, setRet] = useState(defaults.return);
  const [pax, setPax] = useState({ adt: defaults.adt, chd: defaults.chd, inf: defaults.inf });

  const unreachable = useMemo(() => {
    if (!from) return new Set<string>();
    const ok = new Set(reachable[from] ?? []);
    return new Set(airports.filter((a) => !ok.has(a.iata)).map((a) => a.iata));
  }, [from, reachable, airports]);

  function submit() {
    if (!from || !to) return toast.error("Choose where you're flying from and to.");
    if (!depart) return toast.error("Choose a departure date.");
    if (trip === "RT" && !ret) return toast.error("Choose a return date.");
    const q = new URLSearchParams({ trip, from, to, depart, adt: String(pax.adt), chd: String(pax.chd), inf: String(pax.inf) });
    if (trip === "RT" && ret) q.set("return", ret);
    start(() => router.push(`/book/flights?${q}`));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn("rounded-2xl bg-white p-4 text-navy-900 shadow-xl ring-1 ring-black/5 sm:p-6", compact && "shadow-none ring-slate-200")}
    >
      <div className="mb-4 flex gap-1 rounded-full bg-sky-50 p-1 text-sm font-medium sm:w-fit">
        {(["RT", "OW"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTrip(t);
              if (t === "OW") setRet(undefined);
            }}
            className={cn(
              "flex-1 rounded-full px-4 py-1.5 transition sm:flex-none",
              trip === t ? "bg-navy-900 text-white shadow" : "text-navy-800 hover:bg-white",
            )}
          >
            {t === "RT" ? "Round trip" : "One way"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_1.3fr_1fr_auto] lg:items-center">
        <AirportCombobox label="From" kind="from" value={from} onChange={(v) => {
          setFrom(v);
          if (to && !(reachable[v] ?? []).includes(to)) setTo(undefined);
        }} options={airports} />
        <button
          type="button"
          aria-label="Swap origin and destination"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="mx-auto grid size-9 place-items-center rounded-full border border-slate-200 text-navy-700 transition hover:bg-sky-50"
        >
          <ArrowLeftRight className="size-4" />
        </button>
        <AirportCombobox label="To" kind="to" value={to} onChange={setTo} options={airports.filter((a) => a.iata !== from)} disabledCodes={unreachable} />
        <DatePicker
          trip={trip}
          depart={depart}
          ret={ret}
          min={minDate}
          max={maxDate}
          onChange={(d, r) => {
            setDepart(d);
            setRet(r);
          }}
        />
        <PaxPicker value={pax} onChange={setPax} />
        <Button type="submit" disabled={pending} className="h-14 rounded-xl bg-gold-400 px-6 text-base font-semibold text-navy-950 hover:bg-gold-500">
          <Search className="size-5" />
          {pending ? "Searching…" : "Search"}
        </Button>
      </div>
    </form>
  );
}
