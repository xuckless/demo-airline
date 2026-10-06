import "server-only";
import type { AirportOption } from "@/components/booking-widget/types";
import { seedConfig } from "@/config/seed";
import { SERVED } from "@/domain/network";
import { reachableFrom } from "@/domain/search/paths";
import { addDays } from "@/domain/time";
import { today } from "@/lib/clock";

let cached: { airports: AirportOption[]; reachable: Record<string, string[]> } | null = null;

/** Static network data + today's bookable window for the search widget. */
export function widgetProps() {
  cached ??= {
    airports: SERVED.map((a) => ({ iata: a.iata, city: a.city, name: a.name, region: a.region, isHub: a.isHub })),
    reachable: Object.fromEntries(SERVED.map((a) => [a.iata, reachableFrom(a.iata)])),
  };
  const t = today();
  return { ...cached, minDate: t, maxDate: addDays(t, seedConfig.horizonDays) };
}
