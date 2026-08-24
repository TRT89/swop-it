import "server-only";
import { and, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { listings, profiles, reviews, swaps, swoppies, users } from "@/db/schema";

export async function getPublicProfile(userId: string) {
  const [row] = await db
    .select({
      profile: profiles,
      memberSince: users.createdAt,
      emailVerified: users.emailVerified,
      isActive: users.isActive,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(profiles.userId, userId));
  return row ?? null;
}

export async function getReviewsFor(userId: string) {
  const author = alias(profiles, "author_profile");
  return db
    .select({
      review: reviews,
      authorId: author.userId,
      authorName: author.displayName,
      authorAvatar: author.avatarUrl,
      listingTitle: listings.title,
    })
    .from(reviews)
    .innerJoin(author, eq(author.userId, reviews.authorId))
    .innerJoin(swaps, eq(swaps.id, reviews.swapId))
    .innerJoin(listings, eq(listings.id, swaps.listingId))
    .where(eq(reviews.subjectId, userId))
    .orderBy(desc(reviews.createdAt))
    .limit(20);
}

export async function getSwoppies(userId: string) {
  return db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      city: profiles.city,
    })
    .from(swoppies)
    .innerJoin(profiles, eq(profiles.userId, swoppies.swoppyId))
    .where(eq(swoppies.userId, userId))
    .orderBy(desc(swoppies.createdAt));
}

export async function isSwoppy(userId: string, otherId: string) {
  const [row] = await db
    .select({ userId: swoppies.userId })
    .from(swoppies)
    .where(and(eq(swoppies.userId, userId), eq(swoppies.swoppyId, otherId)));
  return Boolean(row);
}

/** Whether these two have completed a Swop together — the gate for Swoppies. */
export async function hasSwoppedWith(userId: string, otherId: string) {
  const [row] = await db
    .select({ id: swaps.id })
    .from(swaps)
    .where(
      and(
        eq(swaps.status, "COMPLETED"),
        or(
          and(eq(swaps.providerId, userId), eq(swaps.requesterId, otherId)),
          and(eq(swaps.providerId, otherId), eq(swaps.requesterId, userId)),
        ),
      ),
    );
  return Boolean(row);
}
