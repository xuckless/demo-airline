import Link from "next/link";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Book" },
  { href: "/manage", label: "Manage booking" },
  { href: "/#where-we-fly", label: "Where we fly" },
  { href: "/#fares", label: "Our fares" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-sm print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="transition hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400 sm:inline">
            Demo site · no real tickets
          </span>
          <Link href="/manage" className="text-sm text-white/80 hover:text-white md:hidden">
            Manage
          </Link>
        </div>
      </div>
    </header>
  );
}
