"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMembers, conversations, listings, messages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { assertMember, findOrCreateConversation } from "@/lib/conversations";
import { messageSchema } from "@/lib/validation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { notify } from "@/lib/notify";
import { and, ne } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

async function postMessage(conversationId: string, senderId: string, body: string) {
  await db.transaction(async (tx) => {
    await tx.insert(messages).values({ conversationId, senderId, body });
    await tx
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
    // The sender has by definition read their own message.
    await tx
      .update(conversationMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, senderId),
        ),
      );

    const recipients = await tx
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          ne(conversationMembers.userId, senderId),
        ),
      );

    await notify(
      tx,
      recipients.map((r) => ({
        userId: r.userId,
        type: "MESSAGE" as const,
        title: "New message",
        body: body.slice(0, 120),
        link: `/messages/${conversationId}`,
      })),
    );
  });
}

export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const conversationId = String(formData.get("conversationId"));

  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  if (!(await assertMember(conversationId, user.id))) {
    return { error: "You are not part of this conversation." };
  }
  if (!rateLimit(`message:${user.id}`, 60, 10 * 60 * 1000).ok) {
    return { error: "You are sending messages very quickly. Take a breath." };
  }

  await postMessage(conversationId, user.id, parsed.data.body);
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { success: "sent" };
}

/** Used from a listing page: opens (or reuses) the chat with the owner. */
export async function contactOwnerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const listingId = String(formData.get("listingId"));

  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId));
  if (!listing) return { error: "That listing no longer exists." };
  if (listing.ownerId === user.id) return { error: "This is your own listing." };

  if (!rateLimit(`contact:${user.id}`, 30, 60 * 60 * 1000).ok) {
    return { error: "Too many new conversations in one hour. Please slow down." };
  }

  const conversationId = await findOrCreateConversation(
    user.id,
    listing.ownerId,
    listing.id,
  );
  await postMessage(conversationId, user.id, parsed.data.body);

  revalidatePath("/messages");
  redirect(`/messages/${conversationId}`);
}

export async function markConversationReadAction(conversationId: string) {
  const user = await requireUser();
  if (!(await assertMember(conversationId, user.id))) return;

  await db
    .update(conversationMembers)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id),
      ),
    );
}
