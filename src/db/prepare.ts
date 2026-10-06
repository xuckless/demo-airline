import type { DbHandle } from "./client";
import { readState } from "./seed/load";
import { seedAll } from "./seed/seedAll";
import { tick } from "./seed/tick";

/** Seed an empty database, or roll an existing one forward to today. */
export async function prepareDb(h: DbHandle, today: string, nowMs: number, log: (m: string) => void = () => {}) {
  const state = await readState(h.pg);
  if (!state.last_tick_date) {
    log("Empty database — seeding the demo world…");
    return { seeded: await seedAll(h.pg, { today, nowMs, log }) };
  }
  return { ticked: await tick(h.pg, today, nowMs, log) };
}
