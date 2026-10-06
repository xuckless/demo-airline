// Verify inventory consistency and print load factors by days out.
import { DATA_DIR, openDb } from "@/db/client";
import { checkConsistency } from "@/db/seed/check";
import { today } from "@/lib/clock";

const h = await openDb({ dir: DATA_DIR, holder: "db:check" });
try {
  const r = await checkConsistency(h.pg, today());
  console.table(r.counts);
  console.table(r.stats);
  console.log(`inventory mismatches: ${r.mismatches}, oversold: ${r.oversold}`);
  if (r.mismatches || r.oversold) process.exitCode = 1;
} finally {
  await h.close();
}
