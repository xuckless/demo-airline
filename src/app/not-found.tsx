import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-semibold tracking-widest text-gold-500 uppercase">404</p>
      <h1 className="mt-2 text-3xl font-semibold text-navy-900">This flight path doesn&apos;t exist</h1>
      <p className="mt-2 text-slate-500">The page you&apos;re looking for has departed or never existed.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-lg bg-navy-900 px-4 py-2 text-white">Book a flight</Link>
        <Link href="/manage" className="rounded-lg border px-4 py-2 text-navy-900">Manage booking</Link>
      </div>
    </div>
  );
}
