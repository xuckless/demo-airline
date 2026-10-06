import Link from "next/link";
import { brand } from "@/config/brand";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy-950 text-white/70 print:hidden">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo className="text-white" />
          <p className="max-w-sm text-sm">
            {brand.tagline} A demonstration airline: schedules, fares and bookings are simulated.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-white">Travel</p>
          <Link href="/" className="block hover:text-white">Book a flight</Link>
          <Link href="/manage" className="block hover:text-white">Manage booking</Link>
          <Link href="/#where-we-fly" className="block hover:text-white">Where we fly</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-white">About</p>
          <Link href="/#fares" className="block hover:text-white">Fare options</Link>
          <p>Hubs: Toronto · Montréal · Vancouver</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {brand.name} (demo). Not a real airline.
      </div>
    </footer>
  );
}
