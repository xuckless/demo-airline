// Migrate, then seed (if empty) or roll the demo window forward. Runs before `next dev/start`.
import { DATA_DIR, openDb } from "@/db/client";
import { prepareDb } from "@/db/prepare";
import { nowMs, today } from "@/lib/clock";

const h = await openDb({ dir: DATA_DIR, holder: "db:setup" });
try {
  const t0 = performance.now();
  const r = await prepareDb(h, today(), nowMs(), (m) => console.log(`[db] ${m}`));
  if (r.ticked?.skipped) console.log(`[db] up to date for ${today()}`);
  console.log(`[db] ready in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
} finally {
  await h.close();
}
