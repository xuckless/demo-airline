import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingDetails } from "@/components/booking/BookingDetails";
import { PrintButton } from "@/components/booking/PrintButton";
import { Stepper } from "@/components/results/Stepper";
import { airport } from "@/config/airports";
import { getBooking } from "@/server/bookings";

type Props = { params: Promise<{ pnr: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Booking ${(await params).pnr.toUpperCase()} confirmed` };
}

export default async function ConfirmationPage({ params }: Props) {
  const b = await getBooking((await params).pnr);
  if (!b) notFound();
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Stepper current={2} />
      <div className="flex flex-col gap-4 rounded-2xl bg-navy-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 size-7 shrink-0 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-semibold">You&apos;re booked!</h1>
            <p className="text-white/70">
              {airport(b.origin).city} {b.tripType === "RT" ? "⇄" : "→"} {airport(b.destination).city} · confirmation sent to {b.contactEmail}
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-white/10 px-5 py-3 text-center">
          <p className="text-xs tracking-widest text-white/60 uppercase">Booking reference</p>
          <p className="font-mono text-3xl font-bold tracking-[0.2em] text-gold-400">{b.pnr}</p>
        </div>
      </div>
      <BookingDetails b={b} />
      <div className="flex flex-wrap gap-3">
        <PrintButton />
        <Link href={`/manage?pnr=${b.pnr}&lastName=${encodeURIComponent(b.passengers[0].lastName)}`} className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-navy-700 hover:underline print:hidden">
          Manage this booking
        </Link>
        <Link href="/" className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-navy-700 hover:underline print:hidden">
          Book another trip
        </Link>
      </div>
    </div>
  );
}
