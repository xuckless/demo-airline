// Roll the demo world forward to today (honours DEMO_TODAY). Add --cloud for Supabase.
import "./_env.mts";
import { openConfigured } from "@/db/client";
import { tick } from "@/db/seed/tick";
import { nowMs, today } from "@/lib/clock";

const h = await openConfigured("db:tick");
try {
  const r = await tick(h.pg, today(), nowMs(), (m) => console.log(`[db] ${m}`));
  if (r.skipped) console.log(`[db] already up to date for ${today()}`);
} finally {
  await h.close();
}
