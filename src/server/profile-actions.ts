"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { profileSchema } from "@/lib/validation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { displayName, bio, city, postalCode, avatarUrl } = parsed.data;

  await db
    .update(profiles)
    .set({
      displayName,
      bio: bio || null,
      city,
      postalCode,
      avatarUrl: avatarUrl || null,
    })
    // Always scoped to the session's own row.
    .where(eq(profiles.userId, user.id));

  revalidatePath("/settings");
  revalidatePath(`/profile/${user.id}`);
  return { success: "Profile saved." };
}
