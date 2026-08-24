import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Swop-it runs on an embedded PostgreSQL (PGlite) locally so `npm run dev`
 * needs no Docker, no cloud project and no connection string. Set
 * DATABASE_URL (e.g. a Vercel Postgres / Neon connection string) to run
 * against a hosted Postgres instead — same Drizzle schema and query code,
 * no other changes needed.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = process.env.SWOPIT_DATA_DIR ?? "./.swopit-data";

type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __swopitClient?: PGlite;
  __swopitDb?: Db;
  __swopitShutdownHooked?: boolean;
  __swopitPool?: Pool;
};

function createLocalDb(): Db {
  const pg = globalForDb.__swopitClient ?? new PGlite(DATA_DIR);
  const db = globalForDb.__swopitDb ?? drizzlePglite(pg, { schema, casing: "snake_case" });

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

  return db;
}

/**
 * Hosted Postgres (e.g. Vercel Postgres) uses a real session-based driver
 * rather than PGlite's WASM connection. This app relies on interactive
 * `db.transaction(...)` calls throughout (swaps, points ledger, reviews),
 * so a pooled node-postgres connection is used rather than an HTTP-only
 * driver, which can't support that.
 */
function createHostedDb(connectionString: string): Db {
  const pool = globalForDb.__swopitPool ?? new Pool({ connectionString });
  const db = drizzleNodePg(pool, { schema, casing: "snake_case" });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__swopitPool = pool;
  }

  return db as unknown as Db;
}

export const db: Db = DATABASE_URL ? createHostedDb(DATABASE_URL) : createLocalDb();
