import "server-only";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { badges, profiles, swaps, userBadges } from "@/db/schema";
import { notify } from "@/lib/notify";

/**
 * Awards any badge whose completed-Swop threshold a member has just crossed.
 * Idempotent: the composite primary key on user_badges means re-running it
 * never duplicates an award.
 */
export async function awardBadges(userIds: string[]) {
  const allBadges = await db.select().from(badges);
  if (allBadges.length === 0) return;

  for (const userId of [...new Set(userIds)]) {
    const [completed] = await db
      .select({ n: count() })
      .from(swaps)
      .where(
        and(
          eq(swaps.status, "COMPLETED"),
          or(eq(swaps.providerId, userId), eq(swaps.requesterId, userId)),
        ),
      );

    const earned = allBadges.filter((b) => (completed?.n ?? 0) >= b.swapThreshold);
    if (earned.length === 0) continue;

    const existing = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          inArray(
            userBadges.badgeId,
            earned.map((b) => b.id),
          ),
        ),
      );
    const alreadyHas = new Set(existing.map((e) => e.badgeId));
    const fresh = earned.filter((b) => !alreadyHas.has(b.id));
    if (fresh.length === 0) continue;

    await db.transaction(async (tx) => {
      await tx
        .insert(userBadges)
        .values(fresh.map((b) => ({ userId, badgeId: b.id })));
      await notify(
        tx,
        fresh.map((b) => ({
          userId,
          type: "BADGE_EARNED" as const,
          title: `New badge: ${b.name} ${b.emoji}`,
          body: b.description,
          link: `/profile/${userId}`,
        })),
      );
    });
  }
}

export async function getUserBadges(userId: string) {
  return db
    .select({ badge: badges, awardedAt: userBadges.awardedAt })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(badges.swapThreshold);
}

export async function getProfile(userId: string) {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return row ?? null;
}
