"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, listingImages, listings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { listingSchema } from "@/lib/validation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { rateLimit } from "@/lib/rate-limit";

export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  if (!rateLimit(`create-listing:${user.id}`, 15, 60 * 60 * 1000).ok) {
    return { error: "That is a lot of listings in one hour. Please slow down." };
  }

  const data = parsed.data;

  // The category must exist and match the chosen kind, otherwise a crafted
  // form could file a service under a product category.
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, data.categoryId), eq(categories.kind, data.kind)));
  if (!category) {
    return { fieldErrors: { categoryId: "Please pick a category for this type." } };
  }

  const listingId = await db.transaction(async (tx) => {
    const [listing] = await tx
      .insert(listings)
      .values({
        ownerId: user.id,
        type: data.type,
        kind: data.kind,
        categoryId: category.id,
        title: data.title,
        description: data.description,
        pricePoints: data.pricePoints,
        priceUnit: data.priceUnit,
        city: data.city,
        postalCode: data.postalCode,
        // Inherit the member's coordinates so distance search works right away.
        latitude: user.latitude,
        longitude: user.longitude,
        availability: data.availability,
        tags: data.tagList,
        loanDurationDays: data.loanDurationDays,
        handover: data.handover || null,
        condition: data.condition || null,
        estimatedMinutes: data.estimatedMinutes,
        presence: data.presence || null,
      })
      .returning();

    if (data.imageUrl) {
      await tx
        .insert(listingImages)
        .values({ listingId: listing!.id, url: data.imageUrl, sortOrder: 0 });
    }

    return listing!.id;
  });

  revalidatePath("/marketplace");
  revalidatePath("/dashboard");
  redirect(`/marketplace/${listingId}?created=1`);
}

export async function setListingStatusAction(_prev: ActionState, formData: FormData) {
  const user = await requireUser();
  const listingId = String(formData.get("listingId"));
  const status = String(formData.get("status"));

  if (status !== "ACTIVE" && status !== "PAUSED" && status !== "DEACTIVATED") {
    return { error: "Unknown status." };
  }

  const updated = await db
    .update(listings)
    .set({ status })
    // Scoping the WHERE to the owner is what stops one member editing another's.
    .where(and(eq(listings.id, listingId), eq(listings.ownerId, user.id)))
    .returning({ id: listings.id });

  if (updated.length === 0) return { error: "That is not your listing." };

  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath(`/profile/${user.id}`);
  return { success: "Listing updated" };
}
