import { Search } from "lucide-react";
import type { Metadata } from "next";
import { BookingDetails } from "@/components/booking/BookingDetails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { airport } from "@/config/airports";
import { findBooking } from "@/server/bookings";

export const metadata: Metadata = { title: "Manage booking" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ManagePage({ searchParams }: Props) {
  const sp = await searchParams;
  const pnr = typeof sp.pnr === "string" ? sp.pnr.trim().toUpperCase() : "";
  const lastName = typeof sp.lastName === "string" ? sp.lastName.trim() : "";
  const searched = Boolean(pnr || lastName);
  const booking = pnr && lastName ? await findBooking(pnr, lastName) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold text-navy-900">Manage your booking</h1>
        <p className="text-slate-500">Find your trip with your 6-character booking reference and a passenger&apos;s last name.</p>
      </div>
      <form method="get" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="pnr" className="text-xs text-slate-600">Booking reference</Label>
          <Input id="pnr" name="pnr" defaultValue={pnr} maxLength={6} placeholder="e.g. K7Q2XM" className="h-11 font-mono uppercase tracking-widest" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName" className="text-xs text-slate-600">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={lastName} placeholder="As on the booking" className="h-11" required />
        </div>
        <Button type="submit" className="h-11 px-6">
          <Search className="size-4" /> Find booking
        </Button>
      </form>

      {searched && !booking && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          We couldn&apos;t find a booking matching that reference and last name.
        </div>
      )}
      {booking && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold text-navy-900">
              {airport(booking.origin).city} {booking.tripType === "RT" ? "⇄" : "→"} {airport(booking.destination).city}
            </h2>
            <p className="font-mono text-lg font-bold tracking-widest text-navy-700">
              {booking.pnr}
              <span className="ml-3 rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-xs font-medium tracking-normal text-emerald-800">
                {booking.status === "CONFIRMED" ? "Confirmed" : booking.status}
              </span>
            </p>
          </div>
          <BookingDetails b={booking} />
          <p className="text-sm text-slate-500">Changes and cancellations are coming soon to this demo.</p>
        </div>
      )}
    </div>
  );
}
