import { z } from "zod";
import { isDateStr } from "@/domain/time";

const name = z
  .string()
  .trim()
  .min(1, "Required")
  .max(40, "Too long")
  .regex(/^[\p{L}][\p{L} '\-.]*$/u, "Letters, spaces, hyphens and apostrophes only");

export const passengerSchema = z.object({
  type: z.enum(["ADT", "CHD", "INF"]),
  firstName: name,
  lastName: name,
  dob: z.string().refine(isDateStr, "Enter a valid date"),
});

export const contactSchema = z.object({
  email: z.email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()\-.]{7,20}$/, "Enter a valid phone number"),
});

export const bookingFormSchema = z.object({
  passengers: z.array(passengerSchema).min(1).max(18),
  contact: contactSchema,
});
export type BookingForm = z.infer<typeof bookingFormSchema>;

/** Age in whole years on a date. */
export function ageOn(dob: string, on: string) {
  const [y1, m1, d1] = dob.split("-").map(Number);
  const [y2, m2, d2] = on.split("-").map(Number);
  return y2 - y1 - (m2 < m1 || (m2 === m1 && d2 < d1) ? 1 : 0);
}

/** Passenger-type age rules: adult 12+, child 2–11 on departure, infant under 2 for the whole trip. */
export function ageError(type: "ADT" | "CHD" | "INF", dob: string, depart: string, lastTravel: string, today: string): string | null {
  if (dob > today) return "Date of birth can't be in the future";
  const a = ageOn(dob, depart);
  if (type === "ADT" && a < 12) return "Adults must be 12 or older";
  if (type === "ADT" && a > 120) return "Check the date of birth";
  if (type === "CHD" && (a < 2 || a > 11)) return "Children must be 2–11 years old";
  if (type === "INF" && ageOn(dob, lastTravel) >= 2) return "Infants must be under 2 for the whole trip";
  return null;
}
