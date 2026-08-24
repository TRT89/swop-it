import "server-only";
import { and, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { listings, profiles, reviews, swaps } from "@/db/schema";

export type SwapWithContext = Awaited<ReturnType<typeof listSwaps>>[number];

export async function listSwaps(userId: string) {
  const requesterProfile = alias(profiles, "requester_profile");
  const providerProfile = alias(profiles, "provider_profile");

  return db
    .select({
      swap: swaps,
      listingTitle: listings.title,
      listingKind: listings.kind,
      listingType: listings.type,
      categoryId: listings.categoryId,
      providerName: providerProfile.displayName,
      providerAvatar: providerProfile.avatarUrl,
      requesterName: requesterProfile.displayName,
      requesterAvatar: requesterProfile.avatarUrl,
    })
    .from(swaps)
    .innerJoin(listings, eq(listings.id, swaps.listingId))
    .innerJoin(providerProfile, eq(providerProfile.userId, swaps.providerId))
    .innerJoin(requesterProfile, eq(requesterProfile.userId, swaps.requesterId))
    .where(or(eq(swaps.providerId, userId), eq(swaps.requesterId, userId)))
    .orderBy(desc(swaps.createdAt));
}

export async function getSwapDetail(swapId: string, viewerId: string) {
  const requesterProfile = alias(profiles, "requester_profile");
  const providerProfile = alias(profiles, "provider_profile");

  const [row] = await db
    .select({
      swap: swaps,
      listing: listings,
      provider: providerProfile,
      requester: requesterProfile,
    })
    .from(swaps)
    .innerJoin(listings, eq(listings.id, swaps.listingId))
    .innerJoin(providerProfile, eq(providerProfile.userId, swaps.providerId))
    .innerJoin(requesterProfile, eq(requesterProfile.userId, swaps.requesterId))
    .where(eq(swaps.id, swapId));

  if (!row) return null;
  // Only the two members of a Swop may see it.
  if (row.swap.providerId !== viewerId && row.swap.requesterId !== viewerId) {
    return null;
  }

  const existingReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.swapId, swapId));

  return {
    ...row,
    myReview: existingReviews.find((r) => r.authorId === viewerId) ?? null,
    theirReview: existingReviews.find((r) => r.authorId !== viewerId) ?? null,
  };
}

export async function countActionableSwaps(userId: string) {
  const rows = await db
    .select({ status: swaps.status, providerId: swaps.providerId, id: swaps.id })
    .from(swaps)
    .where(
      and(
        or(eq(swaps.providerId, userId), eq(swaps.requesterId, userId)),
        or(
          eq(swaps.status, "REQUESTED"),
          eq(swaps.status, "ACCEPTED"),
          eq(swaps.status, "ACTIVE"),
          eq(swaps.status, "COMPLETION_PENDING"),
        ),
      ),
    );
  return rows.length;
}
