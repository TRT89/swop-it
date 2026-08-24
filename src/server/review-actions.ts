"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, reviews, swaps, swoppies } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { reviewSchema } from "@/lib/validation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { notify } from "@/lib/notify";

export async function reviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const [swap] = await db
    .select()
    .from(swaps)
    .where(eq(swaps.id, parsed.data.swapId));

  if (!swap) return { error: "Swop not found." };
  if (swap.providerId !== user.id && swap.requesterId !== user.id) {
    return { error: "This is not your Swop." };
  }
  if (swap.status !== "COMPLETED") {
    return { error: "You can rate each other once the Swop is complete." };
  }

  const subjectId = swap.providerId === user.id ? swap.requesterId : swap.providerId;

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.swapId, swap.id), eq(reviews.authorId, user.id)));
  if (existing) return { error: "You have already rated this Swop." };

  const [author] = await db
    .select({ name: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  await db.transaction(async (tx) => {
    await tx.insert(reviews).values({
      swapId: swap.id,
      authorId: user.id,
      subjectId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    });
    await notify(tx, [
      {
        userId: subjectId,
        type: "REVIEW_RECEIVED",
        title: `${author?.name ?? "A member"} rated your Swop`,
        body: `${parsed.data.rating} out of 5 stars.`,
        link: `/profile/${subjectId}`,
      },
    ]);
  });

  revalidatePath(`/swaps/${swap.id}`);
  revalidatePath(`/profile/${subjectId}`);
  return { success: "Thanks for rating!" };
}

/* ------------------------------------------------------------- swoppies */

export async function toggleSwoppyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const otherId = String(formData.get("userId"));

  if (otherId === user.id) return { error: "You cannot add yourself." };

  const [other] = await db
    .select({ name: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, otherId));
  if (!other) return { error: "That member does not exist." };

  const [existing] = await db
    .select()
    .from(swoppies)
    .where(and(eq(swoppies.userId, user.id), eq(swoppies.swoppyId, otherId)));

  if (existing) {
    // Removing is one-sided: it only drops the viewer's own connection.
    await db
      .delete(swoppies)
      .where(and(eq(swoppies.userId, user.id), eq(swoppies.swoppyId, otherId)));
    revalidatePath(`/profile/${otherId}`);
    return { success: `${other.name} removed from your Swoppies.` };
  }

  // A Swoppy is a trusted connection, so it has to be earned by swopping.
  const [swapTogether] = await db
    .select({ id: swaps.id })
    .from(swaps)
    .where(
      and(
        eq(swaps.status, "COMPLETED"),
        or(
          and(eq(swaps.providerId, user.id), eq(swaps.requesterId, otherId)),
          and(eq(swaps.providerId, otherId), eq(swaps.requesterId, user.id)),
        ),
      ),
    );
  if (!swapTogether) {
    return { error: "You can add someone as a Swoppy after you have completed a Swop together." };
  }

  const [me] = await db
    .select({ name: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, user.id));

  await db.transaction(async (tx) => {
    await tx.insert(swoppies).values({ userId: user.id, swoppyId: otherId });
    await notify(tx, [
      {
        userId: otherId,
        type: "SWOPPY_ADDED",
        title: `${me?.name ?? "A member"} added you as a Swoppy`,
        link: `/profile/${user.id}`,
      },
    ]);
  });

  revalidatePath(`/profile/${otherId}`);
  return { success: `${other.name} is now one of your Swoppies.` };
}
