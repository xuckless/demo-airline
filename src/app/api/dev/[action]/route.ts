import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { checkConsistency } from "@/db/seed/check";
import { truncateAll } from "@/db/seed/reset";
import { seedAll } from "@/db/seed/seedAll";
import { tick } from "@/db/seed/tick";
import { nowMs, today } from "@/lib/clock";

/**
 * Dev-only DB maintenance while `next dev` holds the PGlite lock:
 *   POST /api/dev/tick    roll the demo world forward to today
 *   POST /api/dev/reseed  wipe and rebuild everything (~1 min)
 *   GET  /api/dev/check   inventory consistency + load factors
 *   GET  /api/dev/sample  a few booking references + last names to try in Manage booking
 */
async function run(action: string) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const { pg } = await getDb();
  const log: string[] = [];
  const t0 = performance.now();
  switch (action) {
    case "tick":
      return NextResponse.json(await tick(pg, today(), nowMs(), (m) => log.push(m)));
    case "reseed":
      await truncateAll(pg);
      await seedAll(pg, { today: today(), nowMs: nowMs(), log: (m) => log.push(m) });
      (globalThis as { __demoFresh?: unknown }).__demoFresh = undefined;
      return NextResponse.json({ ok: true, log, seconds: Math.round((performance.now() - t0) / 1000) });
    case "check":
      return NextResponse.json(await checkConsistency(pg, today()));
    case "sample": {
      const { rows } = await pg.query(
        `SELECT b.pnr, p.last_name, b.trip_type, b.origin, b.destination, b.source
           FROM bookings b JOIN passengers p ON p.booking_id = b.id AND p.seq = 1
          WHERE EXISTS (SELECT 1 FROM booking_segments s JOIN flights f ON f.id = s.flight_id
                         WHERE s.booking_id = b.id AND f.dep_local_date >= $1)
          ORDER BY b.source = 'WEB' DESC, b.id DESC LIMIT 8`,
        [today()],
      );
      return NextResponse.json(rows);
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }
}

export async function POST(_: Request, ctx: RouteContext<"/api/dev/[action]">) {
  return run((await ctx.params).action);
}

export async function GET(_: Request, ctx: RouteContext<"/api/dev/[action]">) {
  const { action } = await ctx.params;
  if (action !== "check" && action !== "sample") return NextResponse.json({ error: "Use POST" }, { status: 405 });
  return run(action);
}
