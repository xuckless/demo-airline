"use client";

import { Minus, Plus, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { paxLabel } from "@/lib/pax";

import type { PaxCounts } from "@/lib/pax";

function Row({
  title,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  title: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "grid size-8 place-items-center rounded-full border border-slate-300 text-navy-900 transition hover:border-navy-700 disabled:opacity-30 disabled:hover:border-slate-300";
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="font-medium text-navy-900">{title}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${title}`}>
          <Minus className="size-4" />
        </button>
        <span className="w-4 text-center font-semibold tabular-nums">{value}</span>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${title}`}>
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function PaxPicker({ value, onChange }: { value: PaxCounts; onChange: (v: PaxCounts) => void }) {
  const seats = value.adt + value.chd;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-navy-600 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        }
      >
        <Users className="size-5 shrink-0 text-navy-700" />
        <span className="min-w-0">
          <span className="block text-xs font-medium tracking-wide text-slate-500 uppercase">Passengers</span>
          <span className="block truncate text-base font-semibold text-navy-900">{paxLabel(value)}</span>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Row title="Adults" hint="12+ years" value={value.adt} min={1} max={9 - value.chd} onChange={(adt) => onChange({ ...value, adt, inf: Math.min(value.inf, adt) })} />
        <Row title="Children" hint="2–11 years" value={value.chd} min={0} max={9 - value.adt} onChange={(chd) => onChange({ ...value, chd })} />
        <Row title="Infants" hint="Under 2, on lap" value={value.inf} min={0} max={value.adt} onChange={(inf) => onChange({ ...value, inf })} />
        <p className="border-t pt-2 text-xs text-slate-500">
          Up to 9 seated passengers ({seats} selected). Each infant travels on an adult&apos;s lap.
        </p>
      </PopoverContent>
    </Popover>
  );
}
