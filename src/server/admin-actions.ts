"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { listings, reports, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const isActive = formData.get("isActive") === "true";

  if (userId === admin.id) {
    return { error: "You cannot deactivate your own admin account." };
  }

  await db.update(users).set({ isActive }).where(eq(users.id, userId));
  revalidatePath("/admin");
  return { success: isActive ? "Member reactivated." : "Member deactivated." };
}

export async function setListingActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const listingId = String(formData.get("listingId"));
  const activate = formData.get("activate") === "true";

  await db
    .update(listings)
    .set({ status: activate ? "ACTIVE" : "DEACTIVATED" })
    .where(eq(listings.id, listingId));

  revalidatePath("/admin");
  revalidatePath("/marketplace");
  return { success: activate ? "Listing restored." : "Listing deactivated." };
}

export async function resolveReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const reportId = String(formData.get("reportId"));
  const status = String(formData.get("status"));

  if (status !== "REVIEWED" && status !== "DISMISSED") {
    return { error: "Unknown outcome." };
  }

  await db.update(reports).set({ status }).where(eq(reports.id, reportId));
  revalidatePath("/admin");
  return { success: "Report closed." };
}
