// Migrate, then seed (if empty) or roll the demo window forward. Runs before `next dev/start`.
// `pnpm db:setup --cloud` does the same against Supabase.
import "./_env.mts";
import { databaseUrl, openConfigured } from "@/db/client";
import { prepareDb } from "@/db/prepare";
import { readState } from "@/db/seed/load";
import { seedAll } from "@/db/seed/seedAll";
import { nowMs, today } from "@/lib/clock";

const h = await openConfigured("db:setup");
try {
  const t0 = performance.now();
  const log = (m: string) => console.log(`[db] ${m}`);
  if (databaseUrl()) log(`hosted Postgres: ${new URL(databaseUrl()!).hostname}`);
  // Seeding is allowed from the CLI (not from the hosted app server).
  const empty = !(await readState(h.pg)).last_tick_date;
  if (empty) await seedAll(h.pg, { today: today(), nowMs: nowMs(), log });
  else {
    const r = await prepareDb(h, today(), nowMs(), log);
    if (r.ticked?.skipped) log(`up to date for ${today()}`);
  }
  log(`ready in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
} finally {
  await h.close();
}
