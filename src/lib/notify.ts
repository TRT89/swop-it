import "server-only";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";

type Executor = Pick<typeof db, "insert">;

export async function notify(
  tx: Executor,
  entries: {
    userId: string;
    type: (typeof notifications.$inferInsert)["type"];
    title: string;
    body?: string;
    link?: string;
  }[],
) {
  if (entries.length === 0) return;
  await tx.insert(notifications).values(
    entries.map((e) => ({
      userId: e.userId,
      type: e.type,
      title: e.title,
      body: e.body ?? null,
      link: e.link ?? null,
    })),
  );
}
