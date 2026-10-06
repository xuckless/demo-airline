import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" aria-hidden className="size-7">
        <circle cx="16" cy="16" r="15" className="fill-gold-400" />
        <path d="M6 18.5 26 9l-5.5 14-3.6-5.4L6 18.5Z" className="fill-navy-900" />
        <path d="m16.9 17.6 2.6 6.2-4.7-4.9 2.1-1.3Z" className="fill-navy-700" />
      </svg>
      <span className="text-lg">
        Demo<span className="text-gold-400">Airlines</span>
      </span>
      <span className="sr-only">{brand.name}</span>
    </span>
  );
}
