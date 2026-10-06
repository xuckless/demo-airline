// Roll the demo world forward to today (honours DEMO_TODAY).
import { DATA_DIR, openDb } from "@/db/client";
import { tick } from "@/db/seed/tick";
import { nowMs, today } from "@/lib/clock";

const h = await openDb({ dir: DATA_DIR, holder: "db:tick" });
try {
  const r = await tick(h.pg, today(), nowMs(), (m) => console.log(`[db] ${m}`));
  if (r.skipped) console.log(`[db] already up to date for ${today()}`);
} finally {
  await h.close();
}
