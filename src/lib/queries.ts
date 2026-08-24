import "server-only";
import { and, avg, count, desc, eq, gt, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  conversationMembers,
  messages,
  notifications,
  reviews,
  swaps,
} from "@/db/schema";

export async function countUnreadMessages(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .where(
      and(
        ne(messages.senderId, userId),
        or(
          isNull(conversationMembers.lastReadAt),
          gt(messages.createdAt, conversationMembers.lastReadAt),
        ),
      ),
    );
  return row?.n ?? 0;
}

export async function countUnreadNotifications(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/** Average rating and number of completed Swops for a member. */
export async function getReputation(userId: string) {
  const [rating] = await db
    .select({ average: avg(reviews.rating), n: count() })
    .from(reviews)
    .where(eq(reviews.subjectId, userId));

  const [completed] = await db
    .select({ n: count() })
    .from(swaps)
    .where(
      and(
        eq(swaps.status, "COMPLETED"),
        or(eq(swaps.providerId, userId), eq(swaps.requesterId, userId)),
      ),
    );

  return {
    rating: rating?.average != null ? Number(rating.average) : null,
    reviewCount: rating?.n ?? 0,
    completedSwaps: completed?.n ?? 0,
  };
}

/** Reputation for many members at once, for listing cards. */
export async function getReputationMap(userIds: string[]) {
  type Entry = { rating: number | null; completedSwaps: number };
  const unique = [...new Set(userIds)];
  const map = new Map<string, Entry>();
  if (unique.length === 0) return map;
  for (const id of unique) map.set(id, { rating: null, completedSwaps: 0 });

  const ratingRows = await db
    .select({ userId: reviews.subjectId, average: avg(reviews.rating) })
    .from(reviews)
    .where(inArray(reviews.subjectId, unique))
    .groupBy(reviews.subjectId);

  for (const r of ratingRows) {
    const entry = map.get(r.userId);
    if (entry) entry.rating = r.average != null ? Number(r.average) : null;
  }

  // A member's completed Swops count both the ones they provided and the ones
  // they requested, so tally each side and add them together.
  for (const column of [swaps.providerId, swaps.requesterId]) {
    const rows = await db
      .select({ userId: column, n: count() })
      .from(swaps)
      .where(and(eq(swaps.status, "COMPLETED"), inArray(column, unique)))
      .groupBy(column);
    for (const row of rows) {
      const entry = map.get(row.userId);
      if (entry) entry.completedSwaps += row.n;
    }
  }

  return map;
}

export async function getRecentNotifications(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
