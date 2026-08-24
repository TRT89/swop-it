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
  __swopitShutdownHooked?: boolean;
};

export const pg: PGlite = globalForDb.__swopitClient ?? new PGlite(DATA_DIR);

export const db: Db =
  globalForDb.__swopitDb ?? drizzle(pg, { schema, casing: "snake_case" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__swopitClient = pg;
  globalForDb.__swopitDb = db;
}

/**
 * PostgreSQL needs to shut down rather than vanish. Without this, stopping the
 * dev server leaves the data directory mid-write and the *next* start cannot
 * open it at all — one Ctrl-C would cost you your local data.
 *
 * Registered once per process, and only for a real data directory: an
 * in-memory database (the test suite) has nothing to flush.
 */
if (!globalForDb.__swopitShutdownHooked && !DATA_DIR.startsWith("memory://")) {
  globalForDb.__swopitShutdownHooked = true;

  let closing: Promise<void> | null = null;
  const closeOnce = () => (closing ??= pg.close().catch(() => undefined));

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(signal, async () => {
      await closeOnce();
      // Re-raise with the default handler so the exit code stays honest.
      process.kill(process.pid, signal);
    });
  }
  process.once("beforeExit", closeOnce);
}
