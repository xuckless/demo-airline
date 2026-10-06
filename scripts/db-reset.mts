// Wipe the database and rebuild the demo world from scratch. Add --cloud for Supabase.
import "./_env.mts";
import { rmSync } from "node:fs";
import { DATA_DIR, databaseUrl, LOCK_PATH, openDb, openPostgres } from "@/db/client";
import { acquireLock } from "@/db/lock";
import { prepareDb } from "@/db/prepare";
import { truncateAll } from "@/db/seed/reset";
import { seedAll } from "@/db/seed/seedAll";
import { nowMs, today } from "@/lib/clock";

const url = databaseUrl();
if (url) {
  const h = await openPostgres(url, { migrate: true, max: 4 });
  try {
    const t0 = performance.now();
    await truncateAll(h.pg);
    await seedAll(h.pg, { today: today(), nowMs: nowMs(), log: (m) => console.log(`[db] ${m}`) });
    console.log(`[db] hosted reset complete in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  } finally {
    await h.close();
  }
  process.exit(0);
}
const release = acquireLock(LOCK_PATH, "db:reset"); // refuses while the dev server holds the DB
rmSync(DATA_DIR, { recursive: true, force: true });
release();
const h = await openDb({ dir: DATA_DIR, holder: "db:reset" });
try {
  const t0 = performance.now();
  await prepareDb(h, today(), nowMs(), (m) => console.log(`[db] ${m}`));
  console.log(`[db] reset complete in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
} finally {
  await h.close();
}
