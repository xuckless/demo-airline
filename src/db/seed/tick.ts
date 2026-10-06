import type { SqlDb } from "../sql";
import { seedConfig } from "@/config/seed";
import { mulberry32, hash32 } from "@/domain/rng";
import { generateSchedules, type Schedule } from "@/domain/schedule/generateSchedules";
import { materializeFlights } from "@/domain/schedule/materializeFlights";
import { offsetPeriods } from "@/domain/schedule/periods";
import { generateTraffic, recentBookedAt, withTargets } from "@/domain/seed/traffic";
import { addDays, DAY, type DateStr, parseHhmm } from "@/domain/time";
import type { FlightLeg } from "@/domain/types";
import { copyRows } from "../bulk";
import { loadLegs, readState, writeState } from "./load";
import { insertFlights, insertSchedules, resetSequences } from "./reference";
import { copySink, SCHEDULE_LOOKAHEAD_DAYS } from "./seedAll";

export interface TickResult {
  skipped: boolean;
  newFlights: number;
  newBookings: number;
  purgedBookings: number;
}

/**
 * Roll the demo world forward to `today`: add newly bookable days, top up
 * future flights along the booking curve, and purge old simulated history.
 * Idempotent per day.
 */
export async function tick(pg: SqlDb, today: DateStr, nowMs: number, log: (m: string) => void = () => {}): Promise<TickResult> {
  const state = await readState(pg);
  if (!state.last_tick_date) throw new Error("Database is not seeded");
  if (state.last_tick_date >= today) return { skipped: true, newFlights: 0, newBookings: 0, purgedBookings: 0 };

  const { horizonDays, pastDays, scale } = seedConfig;
  return pg.transaction(async (tx) => {
    // Serverless instances may race to roll forward; only one wins, the rest skip.
    const { rows: lock } = await tx.query<{ ok: boolean }>(`SELECT pg_try_advisory_xact_lock(4242) AS ok`);
    if (!lock[0]?.ok) return { skipped: true, newFlights: 0, newBookings: 0, purgedBookings: 0 };
    const fresh = await readState(tx);
    if (fresh.last_tick_date >= today) return { skipped: true, newFlights: 0, newBookings: 0, purgedBookings: 0 };
    // 1. Extend schedules if the lookahead is running out.
    let schedulesUntil = state.schedules_until;
    if (schedulesUntil < addDays(today, horizonDays + 30)) {
      const from = addDays(schedulesUntil, 1);
      const until = addDays(today, SCHEDULE_LOOKAHEAD_DAYS);
      const next = generateSchedules(offsetPeriods(from, until), Number(state.scale ?? scale));
      const { rows } = await tx.query<{ m: number }>(`SELECT COALESCE(max(id), 0) AS m FROM flight_schedules`);
      await insertSchedules(tx, next, rows[0].m + 1);
      schedulesUntil = until;
    }

    // 2. Materialize newly bookable days.
    const horizonEnd = addDays(today, horizonDays);
    let newFlights = 0;
    if (state.horizon_end < horizonEnd) {
      const { rows } = await tx.query<{
        id: number; flight_number: number; route_id: number; aircraft_code: string; dep_local_time: string;
        block_min: number; dow_mask: number; effective_from: string; effective_to: string; bank_tag: string | null;
      }>(
        `SELECT id, flight_number, route_id, aircraft_code, dep_local_time, block_min, dow_mask,
                effective_from::text, effective_to::text, bank_tag
           FROM flight_schedules WHERE effective_to > $1 ORDER BY id`,
        [state.horizon_end],
      );
      const schedules: Schedule[] = rows.map((r) => ({
        flightNumber: r.flight_number,
        routeId: r.route_id,
        aircraft: r.aircraft_code,
        depLocalMin: parseHhmm(r.dep_local_time),
        blockMin: r.block_min,
        dowMask: r.dow_mask,
        effectiveFrom: r.effective_from,
        effectiveTo: r.effective_to,
        bankTag: r.bank_tag,
      }));
      const maxId = (await tx.query<{ m: number }>(`SELECT COALESCE(max(id), 0) AS m FROM flights`)).rows[0].m;
      const inst = materializeFlights(schedules, addDays(state.horizon_end, 1), horizonEnd, maxId + 1);
      await insertFlights(tx, inst, (i) => rows[i].id);
      await copyRows(
        tx,
        "flight_cabin_inventory",
        ["flight_id", "cabin", "capacity", "sold"],
        inst.flatMap((f) => f.cabins.map((c) => [f.id, c.cabin, c.capacity, 0])),
      );
      newFlights = inst.length;
    }

    // 3. Top up future flights to today's point on the booking curve.
    const legs: FlightLeg[] = await loadLegs(tx, `f.dep_local_date >= $1`, [today]);
    const before = new Map(legs.map((l) => [l.id, Object.fromEntries(Object.entries(l.inv).map(([c, v]) => [c, v!.sold]))]));
    const sims = withTargets(legs, today);
    const { rows: pnrRows } = await tx.query<{ pnr: string }>(`SELECT pnr FROM bookings`);
    const { rows: idRows } = await tx.query<{ m: number }>(`SELECT COALESCE(max(id), 0) AS m FROM bookings`);
    const lastTickAt = Math.max(Number(state.last_tick_at ?? 0), nowMs - 3 * DAY);
    const { bookings: newBookings } = await generateTraffic(sims, {
      rng: mulberry32(hash32("tick", today, Number(state.rng_seed ?? 1))),
      today,
      nowMs,
      firstBookingId: idRows[0].m + 1,
      existingPnrs: new Set(pnrRows.map((r) => r.pnr)),
      bookedAt: recentBookedAt(lastTickAt, nowMs),
      sink: copySink(tx),
    });
    const deltas: (string | number)[][] = [];
    for (const s of sims) {
      for (const [c, v] of Object.entries(s.inv)) if (v!.sold !== before.get(s.id)![c]) deltas.push([s.id, c, v!.sold]);
    }
    await tx.query(`CREATE TEMP TABLE IF NOT EXISTS inv_delta (flight_id int, cabin cabin, sold int) ON COMMIT DROP`);
    await copyRows(tx, "inv_delta", ["flight_id", "cabin", "sold"], deltas);
    await tx.query(
      `UPDATE flight_cabin_inventory i SET sold = d.sold FROM inv_delta d WHERE i.flight_id = d.flight_id AND i.cabin = d.cabin`,
    );

    // 4. Purge simulated history older than the retention window.
    const cutoff = addDays(today, -pastDays);
    const purged = await tx.query(
      `DELETE FROM bookings b WHERE b.source = 'SEED' AND NOT EXISTS (
         SELECT 1 FROM booking_segments s JOIN flights f ON f.id = s.flight_id
          WHERE s.booking_id = b.id AND f.dep_local_date >= $1)`,
      [cutoff],
    );
    await tx.query(
      `DELETE FROM flights f WHERE f.dep_local_date < $1 AND NOT EXISTS (SELECT 1 FROM booking_segments s WHERE s.flight_id = f.id)`,
      [cutoff],
    );
    // Old flights kept for web bookings: resync sold with what remains.
    await tx.query(
      `UPDATE flight_cabin_inventory i SET sold = COALESCE((
         SELECT sum(s.seats) FROM booking_segments s JOIN bookings b ON b.id = s.booking_id
          WHERE s.flight_id = i.flight_id AND s.cabin = i.cabin AND b.status = 'CONFIRMED'), 0)
        WHERE i.flight_id IN (SELECT id FROM flights WHERE dep_local_date < $1)`,
      [cutoff],
    );

    await resetSequences(tx);
    await writeState(tx, { horizon_end: horizonEnd, schedules_until: schedulesUntil, last_tick_date: today, last_tick_at: nowMs });
    const result = { skipped: false, newFlights, newBookings, purgedBookings: purged.affectedRows ?? 0 };
    log(`tick ${state.last_tick_date} → ${today}: +${newFlights} flights, +${newBookings} bookings, -${result.purgedBookings} purged`);
    return result;
  });
}

