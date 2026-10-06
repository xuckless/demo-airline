import { ArrowRight, Check, Plane, X } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { BookingWidget } from "@/components/booking-widget/BookingWidget";
import { AIRPORTS } from "@/config/airports";
import { FARE_BRANDS } from "@/config/fares";
import { addDays } from "@/domain/time";
import { ROUTES, SERVED } from "@/domain/network";
import { today } from "@/lib/clock";
import { fmtDate, fmtMoney } from "@/lib/format";
import { featuredDeals } from "@/server/deals";
import { widgetProps } from "@/server/widget";

const SHOWCASE: [string, string][] = [
  ["YYZ", "YVR"],
  ["YYZ", "YHZ"],
  ["YYZ", "CUN"],
  ["YUL", "YYC"],
  ["YVR", "LAX"],
  ["YYZ", "LGA"],
];

const GRADIENTS = [
  "from-sky-500 to-navy-700",
  "from-teal-500 to-navy-800",
  "from-amber-400 to-rose-500",
  "from-indigo-500 to-navy-900",
  "from-orange-400 to-fuchsia-600",
  "from-slate-500 to-navy-900",
];

export default async function Home() {
  await connection();
  const w = widgetProps();
  const t = today();
  const deals = await featuredDeals(SHOWCASE);
  const regions = [
    { key: "CA", title: "Canada" },
    { key: "US", title: "United States" },
    { key: "SUN", title: "Sun destinations" },
  ] as const;
  const dailyFlights = ROUTES.length;

  return (
    <>
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(242,184,75,0.25),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(42,95,158,0.6),transparent_60%)]" />
        <Plane className="absolute -right-10 top-10 size-72 rotate-12 text-white/5" />
        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-28 sm:px-6 lg:pt-20">
          <p className="mb-3 text-sm font-medium tracking-widest text-gold-400 uppercase">Toronto · Montréal · Vancouver</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Where to next?</h1>
          <p className="mt-4 max-w-xl text-lg text-white/75">
            {SERVED.length} destinations across Canada, the U.S. and the sun — connected through our three hubs.
          </p>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-20 max-w-7xl px-4 sm:px-6">
        <BookingWidget
          airports={w.airports}
          reachable={w.reachable}
          minDate={w.minDate}
          maxDate={w.maxDate}
          defaults={{ trip: "RT", from: "YYZ", adt: 1, chd: 0, inf: 0, depart: addDays(t, 14), return: addDays(t, 21) }}
        />
      </div>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-navy-900">Fares we love right now</h2>
            <p className="text-slate-500">Lowest one-way fares found in the next few weeks, per person before taxes.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((d, i) => (
            <Link
              key={`${d.from}-${d.to}`}
              href={`/book/flights?trip=OW&from=${d.from}&to=${d.to}&depart=${d.date}&adt=1`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} p-6 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <Plane className="absolute -right-4 -bottom-4 size-28 -rotate-12 text-white/10" />
              <p className="text-sm text-white/80">
                {AIRPORTS.find((a) => a.iata === d.from)?.city} to
              </p>
              <p className="text-2xl font-semibold">{d.city}</p>
              <p className="mt-6 text-sm text-white/80">from</p>
              <p className="text-3xl font-bold">{fmtMoney(d.fareCents)}</p>
              <p className="mt-1 text-xs text-white/70">one way · {fmtDate(d.date)}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                Book now <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="fares" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-semibold text-navy-900">Choose how you fly</h2>
        <p className="mb-6 text-slate-500">Four fare options. Basic and Classic share our Economy cabin; Premium Economy and Business have their own.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FARE_BRANDS.map((b) => (
            <div key={b.code} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold tracking-wider text-gold-500 uppercase">{b.tagline}</p>
              <h3 className="mt-1 text-xl font-semibold text-navy-900">{b.name}</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {b.perks.map((p) => (
                  <li key={p.label} className="flex gap-2">
                    {p.included ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <X className="mt-0.5 size-4 shrink-0 text-slate-400" />}
                    <span className={p.included ? "text-slate-700" : "text-slate-400"}>{p.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="where-we-fly" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6">
        <div className="rounded-3xl bg-sky-50 p-6 sm:p-10">
          <h2 className="text-2xl font-semibold text-navy-900">Where we fly</h2>
          <p className="mb-8 text-slate-600">
            A hub-and-spoke network: {dailyFlights} routes, with timed connection banks in Toronto, Montréal and Vancouver.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {regions.map((r) => (
              <div key={r.key}>
                <h3 className="mb-3 font-semibold text-navy-800">{r.title}</h3>
                <ul className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  {SERVED.filter((a) => a.region === r.key).map((a) => (
                    <li key={a.iata} className="flex items-center gap-2">
                      <span className="w-9 font-mono text-xs font-semibold text-slate-500">{a.iata}</span>
                      <span className="text-slate-800">{a.city}</span>
                      {a.isHub && <span className="rounded bg-navy-900 px-1.5 text-[10px] font-semibold text-white">HUB</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
