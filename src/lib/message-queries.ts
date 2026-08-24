import "server-only";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  conversationMembers,
  conversations,
  listings,
  messages,
  profiles,
} from "@/db/schema";

export type ConversationSummary = Awaited<
  ReturnType<typeof listConversations>
>[number];

export async function listConversations(userId: string) {
  const mine = alias(conversationMembers, "mine");
  const theirs = alias(conversationMembers, "theirs");

  return db
    .select({
      id: conversations.id,
      listingId: conversations.listingId,
      listingTitle: listings.title,
      lastMessageAt: conversations.lastMessageAt,
      otherId: theirs.userId,
      otherName: profiles.displayName,
      otherAvatar: profiles.avatarUrl,
      lastMessage: sql<string | null>`(
        SELECT body FROM ${messages}
        WHERE ${messages.conversationId} = ${conversations.id}
        ORDER BY ${messages.createdAt} DESC LIMIT 1
      )`,
      unread: sql<number>`(
        SELECT count(*)::int FROM ${messages}
        WHERE ${messages.conversationId} = ${conversations.id}
          AND ${messages.senderId} <> ${userId}
          AND (${mine.lastReadAt} IS NULL OR ${messages.createdAt} > ${mine.lastReadAt})
      )`,
    })
    .from(conversations)
    .innerJoin(
      mine,
      and(eq(mine.conversationId, conversations.id), eq(mine.userId, userId)),
    )
    .innerJoin(
      theirs,
      and(eq(theirs.conversationId, conversations.id), ne(theirs.userId, userId)),
    )
    .innerJoin(profiles, eq(profiles.userId, theirs.userId))
    .leftJoin(listings, eq(listings.id, conversations.listingId))
    .orderBy(desc(conversations.lastMessageAt));
}

export async function getConversation(conversationId: string, viewerId: string) {
  const mine = alias(conversationMembers, "mine");
  const theirs = alias(conversationMembers, "theirs");

  const [row] = await db
    .select({
      id: conversations.id,
      listingId: conversations.listingId,
      listingTitle: listings.title,
      listingPoints: listings.pricePoints,
      listingUnit: listings.priceUnit,
      listingOwnerId: listings.ownerId,
      listingStatus: listings.status,
      other: profiles,
    })
    .from(conversations)
    .innerJoin(
      mine,
      and(eq(mine.conversationId, conversations.id), eq(mine.userId, viewerId)),
    )
    .innerJoin(
      theirs,
      and(eq(theirs.conversationId, conversations.id), ne(theirs.userId, viewerId)),
    )
    .innerJoin(profiles, eq(profiles.userId, theirs.userId))
    .leftJoin(listings, eq(listings.id, conversations.listingId))
    .where(eq(conversations.id, conversationId));

  if (!row) return null;

  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return { ...row, messages: thread };
}
