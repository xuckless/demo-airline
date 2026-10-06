import { cn } from "@/lib/utils";

const STEPS = ["Flights", "Passengers", "Confirmation"];

export function Stepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 text-sm print:hidden">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full text-xs font-semibold",
              i < current ? "bg-emerald-600 text-white" : i === current ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-500",
            )}
          >
            {i + 1}
          </span>
          <span className={cn(i === current ? "font-semibold text-navy-900" : "text-slate-500")}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300 sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}
