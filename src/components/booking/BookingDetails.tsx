import { airport } from "@/config/airports";
import { BRAND_BY_CODE } from "@/config/fares";
import { AIRCRAFT_BY_CODE, CABIN_NAMES } from "@/config/fleet";
import { dayOffset, flightNo, fmtDate, fmtDateLong, fmtDuration, fmtMoneyExact, fmtTime } from "@/lib/format";
import type { BookingView } from "@/server/bookings";

const TYPE = { ADT: "Adult", CHD: "Child", INF: "Infant" } as const;

export function BookingDetails({ b }: { b: BookingView }) {
  const dirs = (["OUT", "RET"] as const)
    .map((d) => ({ d, segs: b.segments.filter((s) => s.direction === d) }))
    .filter((x) => x.segs.length);
  return (
    <div className="space-y-5">
      {dirs.map(({ d, segs }) => {
        const first = segs[0];
        const last = segs[segs.length - 1];
        return (
          <section key={d} className="rounded-2xl border border-slate-200 bg-white">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-3">
              <h3 className="font-semibold text-navy-900">
                {d === "OUT" ? "Departing" : "Returning"} · {airport(first.origin).city} → {airport(last.dest).city}
              </h3>
              <span className="text-sm text-slate-500">
                {fmtDateLong(first.depLocalDate)} · {fmtDuration((last.arrUtc - first.depUtc) / 60000)} total
              </span>
            </header>
            <ol className="divide-y">
              {segs.map((s) => (
                <li key={s.seq} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-navy-900">
                      {fmtTime(s.depUtc, s.origin)} {s.origin} → {fmtTime(s.arrUtc, s.dest)}
                      {dayOffset(s.depUtc, s.origin, s.arrUtc, s.dest) > 0 && <sup className="text-rose-600">+1</sup>} {s.dest}
                    </p>
                    <p className="text-sm text-slate-500">
                      {flightNo(s.flightNumber)} · {AIRCRAFT_BY_CODE.get(s.aircraft)?.shortName} · {fmtDate(s.depLocalDate)} ·{" "}
                      {airport(s.origin).city} to {airport(s.dest).city}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-medium text-navy-900">{BRAND_BY_CODE.get(s.brand)?.name}</p>
                    <p className="text-xs text-slate-500">
                      {CABIN_NAMES[s.cabin]} · class {s.rbd}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-navy-900">Passengers</h3>
          <ul className="space-y-2 text-sm">
            {b.passengers.map((p) => (
              <li key={p.seq} className="flex justify-between">
                <span className="font-medium">
                  {p.firstName} {p.lastName.toUpperCase()}
                </span>
                <span className="text-slate-500">{TYPE[p.type]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t pt-3 text-xs text-slate-500">
            Contact: {b.contactEmail} · {b.contactPhone}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h3 className="mb-3 font-semibold text-navy-900">Payment summary</h3>
          <div className="flex justify-between"><span>Base fares</span><span className="tabular-nums">{fmtMoneyExact(b.baseCents)}</span></div>
          <div className="flex justify-between"><span>Taxes, fees & charges</span><span className="tabular-nums">{fmtMoneyExact(b.taxCents)}</span></div>
          <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold text-navy-900">
            <span>Total (CAD)</span>
            <span className="tabular-nums">{fmtMoneyExact(b.totalCents)}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Booked {b.bookedAt.toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" })} ET · demo booking, no payment taken
          </p>
        </section>
      </div>
    </div>
  );
}
