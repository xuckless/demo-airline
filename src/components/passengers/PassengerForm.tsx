"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBookingAction } from "@/app/book/passengers/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ageError, type BookingForm, bookingFormSchema } from "@/lib/bookingSchema";

const TYPE_LABEL = { ADT: "Adult", CHD: "Child", INF: "Infant (on lap)" } as const;
const SAMPLE_FIRST = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley"];
const SAMPLE_DOB = { ADT: ["1988-04-12", "1990-09-23", "1975-01-30", "1995-06-17"], CHD: ["2018-03-05", "2016-11-20"], INF: ["2026-02-14"] };

const money = (c: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(c / 100);

export function PassengerForm({
  types,
  query,
  quotedTotalCents,
  depart,
  lastTravel,
  today,
  flightsHref,
}: {
  types: ("ADT" | "CHD" | "INF")[];
  query: string;
  quotedTotalCents: number;
  depart: string;
  lastTravel: string;
  today: string;
  flightsHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [priceChange, setPriceChange] = useState<{ old: number; next: number } | null>(null);
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      passengers: types.map((type) => ({ type, firstName: "", lastName: "", dob: "" })),
      contact: { email: "", phone: "" },
    },
  });
  const { register, formState, handleSubmit, setValue, setError } = form;

  function fillSample() {
    types.forEach((t, i) => {
      setValue(`passengers.${i}.firstName`, SAMPLE_FIRST[i % SAMPLE_FIRST.length]);
      setValue(`passengers.${i}.lastName`, "Demo");
      setValue(`passengers.${i}.dob`, SAMPLE_DOB[t][i % SAMPLE_DOB[t].length]);
    });
    setValue("contact.email", "traveller@example.com");
    setValue("contact.phone", "+1 416 555 0123");
  }

  function submit(data: BookingForm, acceptedTotalCents?: number) {
    let bad = false;
    data.passengers.forEach((p, i) => {
      const e = ageError(p.type, p.dob, depart, lastTravel, today);
      if (e) {
        setError(`passengers.${i}.dob`, { message: e });
        bad = true;
      }
    });
    if (bad) return;
    start(async () => {
      const r = await createBookingAction({ query, form: data, quotedTotalCents, acceptedTotalCents });
      if (r.ok) {
        toast.success(`Booking confirmed — ${r.pnr}`);
        router.push(`/book/confirmation/${r.pnr}`);
      } else if (r.code === "PRICE_CHANGED") {
        setPriceChange({ old: r.oldTotalCents, next: r.newTotalCents });
      } else if (r.code === "SOLD_OUT") {
        toast.error(r.message);
        router.push(flightsHref);
      } else {
        toast.error(r.message);
      }
    });
  }

  const err = formState.errors;
  return (
    <form onSubmit={handleSubmit((d) => submit(d))} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-navy-900">Who&apos;s travelling?</h2>
        <Button type="button" variant="outline" size="sm" onClick={fillSample}>
          <Wand2 className="size-3.5" /> Fill sample details
        </Button>
      </div>
      <p className="-mt-3 text-sm text-slate-500">Enter names exactly as they appear on government-issued ID.</p>
      {types.map((t, i) => (
        <fieldset key={i} className="rounded-xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-navy-900">
            Passenger {i + 1} · {TYPE_LABEL[t]}
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="First name" error={err.passengers?.[i]?.firstName?.message}>
              <Input {...register(`passengers.${i}.firstName`)} autoComplete="given-name" />
            </Field>
            <Field label="Last name" error={err.passengers?.[i]?.lastName?.message}>
              <Input {...register(`passengers.${i}.lastName`)} autoComplete="family-name" />
            </Field>
            <Field label="Date of birth" error={err.passengers?.[i]?.dob?.message}>
              <Input type="date" max={today} {...register(`passengers.${i}.dob`)} />
            </Field>
          </div>
        </fieldset>
      ))}
      <fieldset className="rounded-xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-navy-900">Contact details</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" error={err.contact?.email?.message}>
            <Input type="email" {...register("contact.email")} autoComplete="email" />
          </Field>
          <Field label="Mobile phone" error={err.contact?.phone?.message}>
            <Input type="tel" {...register("contact.phone")} autoComplete="tel" />
          </Field>
        </div>
      </fieldset>
      <div className="flex flex-col gap-3 rounded-xl bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          This is a demo — no payment is taken and no real ticket is issued.
        </p>
        <Button type="submit" disabled={pending} className="h-11 bg-gold-400 px-6 text-base font-semibold text-navy-950 hover:bg-gold-500">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Confirm booking · {money(quotedTotalCents)}
        </Button>
      </div>

      <Dialog open={!!priceChange} onOpenChange={(o) => !o && setPriceChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>The price has changed</DialogTitle>
            <DialogDescription>
              Seats at your fare sold while you were booking. The new total is {priceChange && money(priceChange.next)} (was{" "}
              {priceChange && money(priceChange.old)}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => router.push(flightsHref)}>
              Choose other flights
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                const accepted = priceChange!.next;
                setPriceChange(null);
                handleSubmit((d) => submit(d, accepted))();
              }}
            >
              Continue at new price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
