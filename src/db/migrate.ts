import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePg } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema";
import { reportDatabaseUnavailable } from "./exclusive";

const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = process.env.SWOPIT_DATA_DIR ?? "./.swopit-data";

type MigratableDb = Parameters<typeof migratePglite>[0];

/** Applies the schema to an already-open connection (used by the test suite). */
export async function applyMigrations(db: MigratableDb) {
  await migratePglite(db, { migrationsFolder: "./drizzle" });
}

export async function runMigrations() {
  if (DATABASE_URL) {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzleNodePg(pool, { schema, casing: "snake_case" });
    await migrateNodePg(db, { migrationsFolder: "./drizzle" });
    await pool.end();
    return;
  }

  const client = new PGlite(DATA_DIR);
  const db = drizzlePglite(client, { schema, casing: "snake_case" });
  await applyMigrations(db);
  await client.close();
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrations()
    .then(() => console.log("✓ Database schema is up to date"))
    .catch((error) => reportDatabaseUnavailable(error, "apply the database schema"));
}
