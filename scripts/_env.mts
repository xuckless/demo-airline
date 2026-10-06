// Load .env for CLI scripts. `--cloud` points DATABASE_URL at Supabase (SUPABASE_DB_URL).
// Imported first so it runs before modules that read process.env at import time.
try {
  process.loadEnvFile(".env");
} catch {}
if (process.argv.includes("--cloud")) {
  if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is not set in .env");
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}
export {};
