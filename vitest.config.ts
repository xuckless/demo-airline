import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"], testTimeout: 180_000,
    // Small world for DB integration tests (unit tests pass scale explicitly).
    env: { SEED_SCALE: "0.2", HORIZON_DAYS: "21", PAST_DAYS: "3" },
  },
});
