// Wipe the local PGlite database and rebuild the demo world from scratch.
import { rmSync } from "node:fs";
import { DATA_DIR, LOCK_PATH, openDb } from "@/db/client";
import { acquireLock } from "@/db/lock";
import { prepareDb } from "@/db/prepare";
import { nowMs, today } from "@/lib/clock";

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
