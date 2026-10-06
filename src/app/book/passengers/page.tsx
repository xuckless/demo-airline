import type { Metadata } from "next";
import Link from "next/link";
import { PassengerForm } from "@/components/passengers/PassengerForm";
import { PriceBreakdown } from "@/components/passengers/PriceBreakdown";
import { SelectedFlightCard } from "@/components/results/SelectedFlightCard";
import { Stepper } from "@/components/results/Stepper";
import { fmtMoney } from "@/lib/format";
import { today } from "@/lib/clock";
import { parseSelection, parseTripSearch, tripQuery } from "@/lib/searchParams";
import { priceSelection } from "@/server/booking";
import { cabinNote, legDTO, stopsLabel } from "@/server/present";
import { legsById } from "@/server/search";

export const metadata: Metadata = { title: "Passenger details" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PassengersPage({ searchParams }: Props) {
  const parsed = parseTripSearch(await searchParams);
  const out = parsed.success ? parseSelection(parsed.data.out) : null;
  const ret = parsed.success ? parseSelection(parsed.data.ret) : null;
  if (!parsed.success || !out) return <Problem message="Your flight selection is missing or has expired." href="/" />;
  const s = parsed.data;
  const flightsHref = `/book/flights?${tripQuery(s, { out: undefined, ret: undefined })}`;

  const legs = await legsById([...out.flightIds, ...(ret?.flightIds ?? [])]);
  if (!legs) return <Problem message="One of your selected flights is no longer available." href={flightsHref} />;
  const priced = priceSelection(s, { out, ret }, new Map(legs.map((l) => [l.id, l])));
  if ("error" in priced) return <Problem message={priced.error} href={flightsHref} />;

  const types = [...Array(s.adt).fill("ADT"), ...Array(s.chd).fill("CHD"), ...Array(s.inf).fill("INF")] as ("ADT" | "CHD" | "INF")[];
  const lastTravel = s.trip === "RT" && s.return ? s.return : s.depart;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <Stepper current={1} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PassengerForm
          types={types}
          query={tripQuery(s)}
          quotedTotalCents={priced.quote.totalCents}
          depart={s.depart}
          lastTravel={lastTravel}
          today={today()}
          flightsHref={flightsHref}
        />
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <h2 className="font-semibold text-navy-900">Your trip</h2>
          {priced.directions.map((d) => (
            <SelectedFlightCard
              key={d.dir}
              title={d.dir === "OUT" ? "Departing" : "Returning"}
              legs={d.legs.map(legDTO)}
              brand={d.offer.brand}
              price={`${fmtMoney(d.offer.fareCents)} pp`}
              stops={stopsLabel(d.legs)}
              cabinNote={cabinNote(d.offer, d.legs)}
              changeHref={
                d.dir === "OUT"
                  ? flightsHref
                  : `/book/flights?${tripQuery(s, { ret: undefined })}`
              }
            />
          ))}
          <PriceBreakdown quote={priced.quote} />
        </aside>
      </div>
    </div>
  );
}

function Problem({ message, href }: { message: string; href: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-lg font-semibold text-navy-900">{message}</p>
      <Link href={href} className="mt-4 inline-block rounded-lg bg-navy-900 px-4 py-2 text-white">
        Back to flights
      </Link>
    </div>
  );
}
