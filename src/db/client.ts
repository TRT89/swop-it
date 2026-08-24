import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * Swop-it runs on an embedded PostgreSQL (PGlite) so the prototype starts with
 * `npm run dev` and no Docker, no cloud project and no connection string.
 * The data lives in ./.swopit-data and the schema is plain PostgreSQL, so the
 * same Drizzle models move to a hosted Postgres/Supabase later untouched.
 */
const DATA_DIR = process.env.SWOPIT_DATA_DIR ?? "./.swopit-data";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __swopitClient?: PGlite;
  __swopitDb?: Db;
};

export const pg: PGlite =
  globalForDb.__swopitClient ?? new PGlite(DATA_DIR);

export const db: Db =
  globalForDb.__swopitDb ?? drizzle(pg, { schema, casing: "snake_case" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__swopitClient = pg;
  globalForDb.__swopitDb = db;
}

export { schema };
