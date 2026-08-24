/**
 * The embedded database allows one writer at a time, and a hard kill (rather
 * than Ctrl-C) can leave its directory mid-write. Both surface as the same
 * unhelpful WebAssembly abort, so translate it into something actionable.
 */
export function reportDatabaseUnavailable(error: unknown, task: string): never {
  const text = String(
    (error as { cause?: unknown })?.cause ?? (error as Error)?.message ?? error,
  );

  if (text.includes("Aborted") || text.includes("lock")) {
    console.error(
      `\n✗ Could not ${task}: the database could not be opened.\n\n` +
        "  Either the development server still has it open, or it was left\n" +
        "  mid-write by a hard shutdown.\n\n" +
        "  1. Stop the dev server (Ctrl-C) and try again.\n" +
        "  2. Still failing? Rebuild it from scratch:  npm run db:reset\n\n" +
        "  `npm run dev` migrates and seeds on start, so you rarely need to\n" +
        "  run this command on its own.\n",
    );
  } else {
    console.error(`\n✗ Could not ${task}:\n`, error);
  }
  process.exit(1);
}
