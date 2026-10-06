import "server-only";
import { after } from "next/server";
import { getDb } from "@/db/client";
import { prepareDb } from "@/db/prepare";
import { nowMs, today } from "@/lib/clock";

const g = globalThis as unknown as { __demoFresh?: { day: string; p: Promise<unknown> } };

/**
 * The app's database handle. The first call each (demo) day rolls the world
 * forward — usually already done by `pnpm db:setup` before the server started.
 */
export async function appDb() {
  const h = await getDb();
  const day = today();
  if (g.__demoFresh?.day !== day) {
    g.__demoFresh = {
      day,
      p: prepareDb(h, day, nowMs(), (m) => console.log(`[db] ${m}`)).catch((e) => {
        console.error("[db] daily roll-forward failed", e);
        g.__demoFresh = undefined;
      }),
    };
  }
  if (h.pg.kind === "postgres") {
    // Hosted: never make a visitor wait for the daily roll-forward; finish it after the response.
    try {
      after(() => g.__demoFresh?.p);
    } catch {}
  } else {
    await g.__demoFresh.p;
  }
  return h;
}
