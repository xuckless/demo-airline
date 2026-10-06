const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);

/** Hosted Postgres (Supabase free tier, 500 MB) gets a smaller world than local PGlite. */
const hosted = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? "");

export const seedConfig = {
  /** Multiplies route frequencies and simulated demand (0 < scale <= 1). */
  scale: num(process.env.SEED_SCALE, 1),
  /** Bookable window: today .. today + horizonDays. */
  horizonDays: num(process.env.HORIZON_DAYS, hosted ? 60 : 120),
  /** Flown history kept for the (future) admin views. */
  pastDays: num(process.env.PAST_DAYS, hosted ? 3 : 14),
  rngSeed: num(process.env.SEED_RNG, 20261006),
  /** Final load factor by cabin before per-flight noise. */
  finalLf: { Y: 0.9, W: 0.8, J: 0.72 },
  /** Share of final passengers booked by d days out: 1 / (1 + (d / k)^p). */
  curveK: 28,
  curveP: 1.6,
};
