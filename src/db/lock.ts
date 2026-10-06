import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * PGlite is single-process: two processes opening the same data dir can
 * corrupt it. A pid lockfile makes that fail loudly instead.
 */
export function acquireLock(lockPath: string, holder: string) {
  mkdirSync(dirname(lockPath), { recursive: true });
  if (existsSync(lockPath)) {
    try {
      const { pid, holder: other } = JSON.parse(readFileSync(lockPath, "utf8"));
      if (pid !== process.pid && isAlive(pid)) {
        throw new Error(
          `The database is in use by "${other}" (pid ${pid}). PGlite allows one process at a time — ` +
            `stop it first (or use the dev-only /api/dev/tick endpoint while the server runs).`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("The database is in use")) throw e;
    }
  }
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid, holder, startedAt: new Date().toISOString() }));
  const release = () => {
    try {
      const { pid } = JSON.parse(readFileSync(lockPath, "utf8"));
      if (pid === process.pid) rmSync(lockPath, { force: true });
    } catch {}
  };
  process.once("exit", release);
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.once(sig, () => {
      release();
      process.exit(130);
    });
  }
  return release;
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}
