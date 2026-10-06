// Verify inventory consistency and print load factors by days out. Add --cloud for Supabase.
import "./_env.mts";
import { openConfigured } from "@/db/client";
import { checkConsistency } from "@/db/seed/check";
import { today } from "@/lib/clock";

const h = await openConfigured("db:check", { migrate: false });
try {
  const r = await checkConsistency(h.pg, today());
  console.table(r.counts);
  console.table(r.stats);
  console.log(`inventory mismatches: ${r.mismatches}, oversold: ${r.oversold}`);
  if (r.mismatches || r.oversold) process.exitCode = 1;
} finally {
  await h.close();
}
