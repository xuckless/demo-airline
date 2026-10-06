import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingWidget } from "@/components/booking-widget/BookingWidget";
import { DateStrip } from "@/components/results/DateStrip";
import { ItineraryCard } from "@/components/results/ItineraryCard";
import { SearchSummary } from "@/components/results/SearchSummary";
import { SelectedFlightCard } from "@/components/results/SelectedFlightCard";
import { Stepper } from "@/components/results/Stepper";
import { airport } from "@/config/airports";
import type { SortKey } from "@/domain/search/buildItineraries";
import { priceBrand } from "@/domain/pricing/offer";
import { validateItinerary } from "@/domain/search/validate";
import { HOUR } from "@/domain/time";
import { nowMs, today } from "@/lib/clock";
import { fmtDateLong, fmtMoney } from "@/lib/format";
import { formatSelection, parseSelection, parseTripSearch, tripQuery, validateDates } from "@/lib/searchParams";
import { cn } from "@/lib/utils";
import { cabinNote, itinDTO, legDTO, stopsLabel } from "@/server/present";
import { dateStrip, legsById, searchFlights } from "@/server/search";
import { widgetProps } from "@/server/widget";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = parseTripSearch(await searchParams);
  if (!p.success) return { title: "Find flights" };
  return { title: `${airport(p.data.from).city} to ${airport(p.data.to).city} · Select flights` };
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "dep", label: "Departure" },
  { key: "duration", label: "Duration" },
  { key: "price", label: "Lowest price" },
];

function SearchError({ message }: { message: string }) {
  const w = widgetProps();
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">{message}</div>
      <BookingWidget airports={w.airports} reachable={w.reachable} minDate={w.minDate} maxDate={w.maxDate} defaults={{ trip: "RT", adt: 1, chd: 0, inf: 0 }} />
    </div>
  );
}

export default async function FlightsPage({ searchParams }: Props) {
  const parsed = parseTripSearch(await searchParams);
  if (!parsed.success) return <SearchError message={parsed.error.issues[0]?.message ?? "Please check your search."} />;
  const s = parsed.data;
  const t = today();
  const dateErr = validateDates(s, t);
  if (dateErr) return <SearchError message={dateErr} />;

  const seats = s.adt + s.chd;
  const outSel = parseSelection(s.out);
  const retSel = parseSelection(s.ret);
  if (outSel && (s.trip === "OW" || retSel)) redirect(`/book/passengers?${tripQuery(s)}`);

  // Return step: re-validate the chosen outbound against live inventory.
  let outbound: { legs: Awaited<ReturnType<typeof legsById>> & {}; offer: ReturnType<typeof priceBrand> } | null = null;
  if (outSel) {
    const legs = await legsById(outSel.flightIds);
    const err = legs ? validateItinerary(legs, { from: s.from, to: s.to, date: s.depart, nowMs: nowMs() }) : "Flight not found";
    const offer = legs && !err ? priceBrand(legs, outSel.brand, seats, t) : null;
    if (!legs || err || !offer || offer.status !== "AVAILABLE") redirect(`/book/flights?${tripQuery(s, { out: undefined })}`);
    outbound = { legs, offer };
  }

  const step = outbound ? "RET" : "OUT";
  const from = step === "OUT" ? s.from : s.to;
  const to = step === "OUT" ? s.to : s.from;
  const date = step === "OUT" ? s.depart : s.return!;
  const minDepUtc = outbound ? outbound.legs[outbound.legs.length - 1].arrUtc + 2 * HOUR : undefined;

  const [its, strip] = await Promise.all([
    searchFlights({ from, to, date, seats, sort: s.sort, minDepUtc }),
    dateStrip({ from, to, seats, center: date, minDate: step === "RET" ? s.depart : undefined, minDepUtc }),
  ]);

  const selectHref = (key: string, brand: Parameters<typeof formatSelection>[1]) => {
    const sel = formatSelection(key.split("-").map(Number), brand);
    if (step === "OUT") return s.trip === "RT" ? `/book/flights?${tripQuery(s, { out: sel, ret: undefined })}` : `/book/passengers?${tripQuery(s, { out: sel })}`;
    return `/book/passengers?${tripQuery(s, { ret: sel })}`;
  };
  const stripHref = (d: string) =>
    step === "OUT"
      ? `/book/flights?${tripQuery(s, { depart: d, return: s.trip === "RT" && s.return && s.return < d ? d : s.return, out: undefined, ret: undefined })}`
      : `/book/flights?${tripQuery(s, { return: d, ret: undefined })}`;
  const dtos = its.map((it) => itinDTO(it, selectHref));

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <Stepper current={0} />
      <SearchSummary s={s} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <div>
            <p className="text-sm font-medium text-gold-500">{step === "OUT" ? (s.trip === "RT" ? "Step 1 of 2" : "Your flight") : "Step 2 of 2"}</p>
            <h1 className="text-2xl font-semibold text-navy-900">
              {step === "OUT" ? "Select your departing flight" : "Select your return flight"}
            </h1>
            <p className="text-slate-500">
              {airport(from).city} ({from}) to {airport(to).city} ({to}) · {fmtDateLong(date)}
            </p>
          </div>
          <DateStrip days={strip} selected={date} hrefFor={stripHref} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {its.length} option{its.length === 1 ? "" : "s"} · prices per passenger, one way, before taxes & fees
            </p>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-medium">
              {SORTS.map((o) => (
                <Link
                  key={o.key}
                  scroll={false}
                  href={`/book/flights?${tripQuery(s, { sort: o.key })}`}
                  className={cn("rounded-full px-3 py-1.5", s.sort === o.key ? "bg-white text-navy-900 shadow" : "text-slate-600 hover:text-navy-900")}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden grid-cols-[1fr_minmax(0,1.5fr)] gap-4 px-5 text-xs font-semibold tracking-wide text-slate-500 uppercase lg:grid">
            <span />
            <div className="grid grid-cols-4 gap-2 text-center">
              <span>Basic</span>
              <span>Classic</span>
              <span>Premium Econ.</span>
              <span>Business</span>
            </div>
          </div>
          {dtos.length ? (
            <div className="space-y-3">
              {dtos.map((d) => (
                <ItineraryCard key={d.key} it={d} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-semibold text-navy-900">No flights left on this date</p>
              <p className="text-sm text-slate-500">Try another day from the date bar above.</p>
            </div>
          )}
        </div>
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <h2 className="font-semibold text-navy-900">Your trip</h2>
          {outbound ? (
            <SelectedFlightCard
              title="Departing"
              legs={outbound.legs.map(legDTO)}
              brand={outSel!.brand}
              price={fmtMoney(outbound.offer.fareCents)}
              stops={stopsLabel(outbound.legs)}
              cabinNote={cabinNote(outbound.offer, outbound.legs)}
              changeHref={`/book/flights?${tripQuery(s, { out: undefined, ret: undefined })}`}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Departing: {airport(s.from).city} → {airport(s.to).city}
              <br />
              {fmtDateLong(s.depart)}
            </div>
          )}
          {s.trip === "RT" && (
            <div className={cn("rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500", step === "RET" && "border-navy-600 bg-sky-50")}>
              Returning: {airport(s.to).city} → {airport(s.from).city}
              <br />
              {fmtDateLong(s.return!)}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Fares are per passenger and change with demand. Taxes and fees are added at checkout. Infants on lap: $10 per flight direction.
          </p>
        </aside>
      </div>
    </div>
  );
}
