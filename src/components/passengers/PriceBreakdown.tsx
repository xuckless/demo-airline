import type { TripQuote } from "@/domain/pricing/quote";
import { fmtMoneyExact } from "@/lib/format";
import { airport } from "@/config/airports";

export function PriceBreakdown({ quote }: { quote: TripQuote }) {
  const seats = quote.pax.adults + quote.pax.children;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h3 className="font-semibold text-navy-900">Price summary</h3>
      {quote.directions.map((d, i) => (
        <div key={i} className="space-y-1">
          <p className="font-medium text-slate-700">
            {airport(d.origin).city} → {airport(d.dest).city}
          </p>
          <Row label={`Air fare × ${seats}`} cents={d.fareCents * seats} />
          {d.taxes.map((t) => (
            <Row key={t.code + t.label} label={`${t.label} × ${seats}`} cents={t.cents * seats} muted />
          ))}
        </div>
      ))}
      {quote.infantFeeCents > 0 && <Row label={`Infant on lap × ${quote.pax.infants}`} cents={quote.infantFeeCents} />}
      <div className="space-y-1 border-t pt-2">
        <Row label="Base fares" cents={quote.baseCents} />
        <Row label="Taxes, fees & charges" cents={quote.taxCents} />
      </div>
      <div className="flex items-baseline justify-between border-t pt-2">
        <span className="font-semibold text-navy-900">Total (CAD)</span>
        <span className="text-xl font-bold text-navy-900">{fmtMoneyExact(quote.totalCents)}</span>
      </div>
    </div>
  );
}

function Row({ label, cents, muted }: { label: string; cents: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${muted ? "text-xs text-slate-500" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{fmtMoneyExact(cents)}</span>
    </div>
  );
}
