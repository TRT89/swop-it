import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

const DATA_DIR = process.env.SWOPIT_DATA_DIR ?? "./.swopit-data";

type MigratableDb = Parameters<typeof migrate>[0];

/** Applies the schema to an already-open connection (used by the test suite). */
export async function applyMigrations(db: MigratableDb) {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

export async function runMigrations() {
  const client = new PGlite(DATA_DIR);
  const db = drizzle(client, { schema, casing: "snake_case" });
  await applyMigrations(db);
  await client.close();
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrations()
    .then(() => console.log("✓ Database schema is up to date"))
    .catch((err) => {
      console.error("✗ Migration failed:", err);
      process.exit(1);
    });
}
