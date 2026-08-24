"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { feedback, reports } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { feedbackSchema, reportSchema } from "@/lib/validation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { rateLimit } from "@/lib/rate-limit";

export async function reportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  if (!rateLimit(`report:${user.id}`, 10, 60 * 60 * 1000).ok) {
    return { error: "You have sent a lot of reports recently. Please give us time to review them." };
  }

  await db.insert(reports).values({
    reporterId: user.id,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  revalidatePath("/admin");
  return { success: "Report received" };
}

export async function feedbackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const key = user ? `feedback:${user.id}` : "feedback:anonymous";
  if (!rateLimit(key, 10, 60 * 60 * 1000).ok) {
    return { error: "Thanks for all the input — please come back in a little while." };
  }

  await db.insert(feedback).values({
    userId: user?.id ?? null,
    type: parsed.data.type,
    message: parsed.data.message,
  });

  revalidatePath("/admin");
  return { success: "Thank you! Your feedback is with the team." };
}
