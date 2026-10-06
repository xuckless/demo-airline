import "server-only";
import { createBooking as create, type CreateBookingInput, priceSelection as price } from "@/db/booking";
import { nowMs, today } from "@/lib/clock";
import type { Selection, TripSearch } from "@/lib/searchParams";
import type { FlightLeg } from "@/domain/types";
import { appDb } from "./db";

export type { BookingResult, PricedTrip } from "@/db/booking";

export const priceSelection = (search: TripSearch, sel: { out: Selection; ret?: Selection | null }, legsById: Map<number, FlightLeg>) =>
  price(search, sel, legsById, today(), nowMs());

export async function createBooking(input: CreateBookingInput) {
  const { pg } = await appDb();
  return create(pg, input, today(), nowMs());
}
