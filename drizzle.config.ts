import { defineConfig } from "drizzle-kit";

// Used for `drizzle-kit generate` only. The app applies migrations itself on startup.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
