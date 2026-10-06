"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const toDate = (s?: string) => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const toStr = (d?: Date) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined;

const label = (s?: string) =>
  s ? toDate(s)!.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }) : undefined;

function Field({ title, value }: { title: string; value?: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</span>
      <span className={value ? "block truncate text-base font-semibold text-navy-900" : "block text-base text-slate-400"}>
        {label(value) ?? "Add date"}
      </span>
    </span>
  );
}

export function DatePicker({
  trip,
  depart,
  ret,
  min,
  max,
  onChange,
}: {
  trip: "RT" | "OW";
  depart?: string;
  ret?: string;
  min: string;
  max: string;
  onChange: (depart?: string, ret?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const disabled = [{ before: toDate(min)! }, { after: toDate(max)! }];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-navy-600 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        }
      >
        <CalendarDays className="size-5 shrink-0 text-navy-700" />
        <Field title="Depart" value={depart} />
        {trip === "RT" && (
          <>
            <span className="h-8 w-px bg-slate-200" />
            <Field title="Return" value={ret} />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        {trip === "RT" ? (
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={toDate(depart) ?? toDate(min)}
            selected={{ from: toDate(depart), to: toDate(ret) }}
            onSelect={(r: DateRange | undefined) => {
              onChange(toStr(r?.from), toStr(r?.to));
              if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) setOpen(false);
            }}
            disabled={disabled}
            className="[--cell-size:--spacing(9)]"
          />
        ) : (
          <Calendar
            mode="single"
            numberOfMonths={2}
            defaultMonth={toDate(depart) ?? toDate(min)}
            selected={toDate(depart)}
            onSelect={(d: Date | undefined) => {
              onChange(toStr(d), undefined);
              if (d) setOpen(false);
            }}
            disabled={disabled}
            className="[--cell-size:--spacing(9)]"
          />
        )}
        <p className="px-2 pb-1 text-xs text-slate-500">Flights are on sale through {label(max)}.</p>
      </PopoverContent>
    </Popover>
  );
}
