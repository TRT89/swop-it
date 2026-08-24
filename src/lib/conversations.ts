import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMembers, conversations } from "@/db/schema";

/**
 * One conversation per pair of members per listing, so chatting about a
 * pressure washer never gets mixed up with chatting about a lawn mower.
 */
export async function findOrCreateConversation(
  userA: string,
  userB: string,
  listingId: string | null,
) {
  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        listingId
          ? eq(conversations.listingId, listingId)
          : sql`${conversations.listingId} IS NULL`,
        sql`EXISTS (SELECT 1 FROM ${conversationMembers} m WHERE m.conversation_id = ${conversations.id} AND m.user_id = ${userA})`,
        sql`EXISTS (SELECT 1 FROM ${conversationMembers} m WHERE m.conversation_id = ${conversations.id} AND m.user_id = ${userB})`,
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  return db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({ listingId })
      .returning();
    await tx.insert(conversationMembers).values([
      { conversationId: conversation!.id, userId: userA },
      { conversationId: conversation!.id, userId: userB },
    ]);
    return conversation!.id;
  });
}

export async function assertMember(conversationId: string, userId: string) {
  const [member] = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    );
  return Boolean(member);
}
