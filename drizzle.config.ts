import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  driver: "pglite",
  dbCredentials: { url: process.env.SWOPIT_DATA_DIR ?? "./.swopit-data" },
} satisfies Config;
