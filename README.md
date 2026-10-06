# DemoAirlines

A demo airline booking site (Next.js 16 + PGlite + Drizzle): a Canadian hub-and-spoke network
(YYZ · YUL · YVR + 30 spokes), real-ish schedules with connecting banks, revenue-managed fares in four
brands, and a guest booking flow. Everything runs locally — no external services.

## Run it

```bash
pnpm install
pnpm dev          # migrates + seeds on first run (~1 min), then starts next dev
```

Open http://localhost:3000. The first run builds ~43k flights and ~850k simulated bookings into `.data/pglite`.

| Script | What it does |
| --- | --- |
| `pnpm dev` / `pnpm start` | `db:setup` (migrate, seed if empty, roll forward to today) then Next |
| `pnpm db:reset` | wipe and rebuild the demo world |
| `pnpm db:tick` | roll the world forward (new bookable day, demand top-up, purge old history) |
| `pnpm db:check` | inventory ⇄ bookings consistency + load factor by days-out |
| `pnpm net:check` | how many O&D markets have no itinerary on sample days |
| `pnpm test` | unit tests (pricing, search, schedules) + DB integration tests (in-memory PGlite) |
| `pnpm db:generate` | generate a Drizzle migration after editing `src/db/schema.ts` |

**PGlite is single-process.** While `next dev` runs it holds `.data/pglite.lock`; CLI `db:*` scripts refuse to run.
Use the dev endpoints instead: `POST /api/dev/tick`, `POST /api/dev/reseed`, `GET /api/dev/check`,
`GET /api/dev/sample` (booking references + last names to try in Manage booking).

Knobs (env): `SEED_SCALE` (frequency multiplier, default 1), `HORIZON_DAYS` (120), `PAST_DAYS` (14),
`DEMO_TODAY=YYYY-MM-DD` (time-travel the clock), `PGLITE_DIR`.

## How it works

- **Network** — `src/config/network.ts` lists hub↔spoke and hub↔hub routes with daily frequency and aircraft.
- **Schedules** — `src/domain/schedule`: spoke flights are timed into hub banks (arrive 15–45 min before a bank,
  leave 30–60 min after; U.S.-bound 60–90 for preclearance). Trunks aim to hit banks at both ends. Schedules are
  split into periods at DST changes so connections hold all year.
- **Fleet & cabins** — Dash 8-400 (Y), E175 (J+Y), A321neo (J+W+Y), 787-9 (lie-flat J+W+Y).
- **Fares** — `src/config/fares.ts`: brands Basic & Classic (Economy), Premium Economy, Business. Each brand has a
  nested bucket ladder (RBDs) that closes by load factor and advance purchase (`src/domain/pricing/rm.ts`).
  O&D fares scale with distance, connections are discounted, mixed-cabin itineraries are supported, Canadian
  taxes/fees are itemized.
- **Search** — `src/domain/search`: direct, 1-stop and 2-stop paths with circuity limits, MCT/MaxCT, dominance
  pruning, availability for the party size (lap infants take no seat), 7-day lowest-fare strip.
- **Simulated demand** — `src/domain/seed/traffic.ts` fills every flight along a booking curve with real
  bookings (locals, hub connections, round trips), priced as RM would have priced them when booked.
  `inventory.sold` always equals the seats on confirmed booking segments.
- **Booking** — `src/db/booking.ts`: re-validates and re-prices inside a transaction, guarded inventory
  decrement (no oversell), price-changed confirmation, 6-char PNR.

Moving to Supabase later: the schema/migrations are plain Postgres; swap `src/db/client.ts` to a
postgres driver on `DATABASE_URL` and replace the PGlite COPY in `src/db/bulk.ts`.
