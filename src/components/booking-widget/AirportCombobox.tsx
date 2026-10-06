"use client";

import { MapPin, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AirportOption } from "./types";

const GROUPS: { region: AirportOption["region"]; label: string }[] = [
  { region: "CA", label: "Canada" },
  { region: "US", label: "United States" },
  { region: "SUN", label: "Sun destinations" },
];

export function AirportCombobox({
  label,
  kind,
  value,
  onChange,
  options,
  disabledCodes,
}: {
  label: string;
  kind: "from" | "to";
  value?: string;
  onChange: (iata: string) => void;
  options: AirportOption[];
  disabledCodes?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.iata === value);
  const Icon = kind === "from" ? PlaneTakeoff : PlaneLanding;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-navy-600 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        }
      >
        <Icon className="size-5 shrink-0 text-navy-700" />
        <span className="min-w-0">
          <span className="block text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</span>
          {selected ? (
            <span className="block truncate text-base font-semibold text-navy-900">
              {selected.city} <span className="font-normal text-slate-500">({selected.iata})</span>
            </span>
          ) : (
            <span className="block text-base text-slate-400">City or airport</span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command
          filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder="Search city or airport code" />
          <CommandList className="max-h-80">
            <CommandEmpty>No destinations found.</CommandEmpty>
            {GROUPS.map((g) => {
              const items = options.filter((o) => o.region === g.region);
              if (!items.length) return null;
              return (
                <CommandGroup key={g.region} heading={g.label}>
                  {items.map((o) => {
                    const disabled = disabledCodes?.has(o.iata) ?? false;
                    return (
                      <CommandItem
                        key={o.iata}
                        value={`${o.city} ${o.iata} ${o.name}`}
                        disabled={disabled}
                        onSelect={() => {
                          onChange(o.iata);
                          setOpen(false);
                        }}
                        className={cn("flex items-center gap-3", o.iata === value && "bg-sky-50")}
                      >
                        <MapPin className="size-4 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {o.city}
                            {o.isHub && <span className="ml-2 rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">HUB</span>}
                          </span>
                          <span className="block truncate text-xs text-slate-500">{o.name}</span>
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-500">{o.iata}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
