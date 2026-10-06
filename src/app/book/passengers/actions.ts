"use server";

import { bookingFormSchema } from "@/lib/bookingSchema";
import { parseSelection, parseTripSearch } from "@/lib/searchParams";
import { type BookingResult, createBooking } from "@/server/booking";

export async function createBookingAction(input: {
  query: string;
  form: unknown;
  quotedTotalCents: number;
  acceptedTotalCents?: number;
}): Promise<BookingResult> {
  const search = parseTripSearch(Object.fromEntries(new URLSearchParams(input.query)));
  if (!search.success) return { ok: false, code: "INVALID", message: "Your search has expired. Please search again." };
  const out = parseSelection(search.data.out);
  const ret = parseSelection(search.data.ret);
  if (!out || (search.data.trip === "RT" && !ret)) return { ok: false, code: "INVALID", message: "Please select your flights again." };
  const form = bookingFormSchema.safeParse(input.form);
  if (!form.success) return { ok: false, code: "INVALID", message: form.error.issues[0]?.message ?? "Please check passenger details." };
  return createBooking({
    search: search.data,
    out,
    ret,
    form: form.data,
    quotedTotalCents: Math.round(Number(input.quotedTotalCents) || 0),
    acceptedTotalCents: input.acceptedTotalCents,
  });
}
