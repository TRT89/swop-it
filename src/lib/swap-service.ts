import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { listings, profiles, swaps, wallets } from "@/db/schema";
import { settleSwap } from "@/lib/points";
import { notify } from "@/lib/notify";
import { findOrCreateConversation } from "@/lib/conversations";
import { awardBadges } from "@/lib/badge-service";

export class SwapError extends Error {}

const OPEN_STATUSES = ["REQUESTED", "ACCEPTED", "ACTIVE", "COMPLETION_PENDING"] as const;

export type SwapRole = "provider" | "requester";

async function loadSwapContext(swapId: string) {
  const [row] = await db
    .select({
      swap: swaps,
      listing: listings,
      provider: profiles,
    })
    .from(swaps)
    .innerJoin(listings, eq(listings.id, swaps.listingId))
    .innerJoin(profiles, eq(profiles.userId, swaps.providerId))
    .where(eq(swaps.id, swapId));
  return row ?? null;
}

async function displayName(userId: string) {
  const [row] = await db
    .select({ name: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return row?.name ?? "A member";
}

/* ------------------------------------------------------------- requesting */

export async function requestSwap(args: {
  actorId: string;
  listingId: string;
  note?: string | null;
  scheduledFor?: string | null;
}) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, args.listingId));

  if (!listing) throw new SwapError("That listing no longer exists.");
  if (listing.status !== "ACTIVE") throw new SwapError("That listing is no longer available.");
  if (listing.ownerId === args.actorId) {
    throw new SwapError("You cannot request your own listing.");
  }

  // On an OFFER the owner provides and the visitor pays. On a REQUEST the owner
  // is asking for help, so the visitor provides and the owner pays.
  const providerId = listing.type === "OFFER" ? listing.ownerId : args.actorId;
  const requesterId = listing.type === "OFFER" ? args.actorId : listing.ownerId;

  const [existing] = await db
    .select({ id: swaps.id })
    .from(swaps)
    .where(
      and(
        eq(swaps.listingId, listing.id),
        eq(swaps.providerId, providerId),
        eq(swaps.requesterId, requesterId),
        inArray(swaps.status, [...OPEN_STATUSES]),
      ),
    );
  if (existing) {
    throw new SwapError("You already have an open Swop for this listing.");
  }

  // Early warning only — the binding check happens when points actually move.
  const [payer] = await db.select().from(wallets).where(eq(wallets.userId, requesterId));
  if ((payer?.balance ?? 0) < listing.pricePoints) {
    throw new SwapError(
      requesterId === args.actorId
        ? `You have ${payer?.balance ?? 0} SP but this Swop costs ${listing.pricePoints} SP. Earn a few points first by offering something.`
        : "The member who posted this request does not have enough Social Points right now.",
    );
  }

  const conversationId = await findOrCreateConversation(
    providerId,
    requesterId,
    listing.id,
  );

  const swapId = await db.transaction(async (tx) => {
    const [swap] = await tx
      .insert(swaps)
      .values({
        listingId: listing.id,
        providerId,
        requesterId,
        conversationId,
        points: listing.pricePoints,
        status: "REQUESTED",
        note: args.note || null,
        scheduledFor: args.scheduledFor || null,
      })
      .returning();

    await notify(tx, [
      {
        userId: listing.ownerId,
        type: "SWAP_REQUESTED",
        title: `${await displayName(args.actorId)} wants to Swop`,
        body: `${listing.title} — ${listing.pricePoints} SP`,
        link: `/swaps/${swap!.id}`,
      },
    ]);

    return swap!.id;
  });

  return swapId;
}

/* -------------------------------------------------------------- responding */

/** Accepting and declining belong to whoever posted the listing. */
export async function respondToSwap(args: {
  actorId: string;
  swapId: string;
  decision: "ACCEPTED" | "DECLINED";
}) {
  const context = await loadSwapContext(args.swapId);
  if (!context) throw new SwapError("Swop not found.");
  const { swap, listing } = context;

  if (listing.ownerId !== args.actorId) {
    throw new SwapError("Only the member who posted the listing can answer this request.");
  }
  if (swap.status !== "REQUESTED") {
    throw new SwapError("This request has already been answered.");
  }

  const otherId = swap.providerId === args.actorId ? swap.requesterId : swap.providerId;

  await db.transaction(async (tx) => {
    await tx
      .update(swaps)
      .set({
        status: args.decision,
        closedAt: args.decision === "DECLINED" ? new Date() : null,
      })
      .where(and(eq(swaps.id, swap.id), eq(swaps.status, "REQUESTED")));

    await notify(tx, [
      {
        userId: otherId,
        type: args.decision === "ACCEPTED" ? "SWAP_ACCEPTED" : "SWAP_DECLINED",
        title:
          args.decision === "ACCEPTED"
            ? `${await displayName(args.actorId)} accepted your request`
            : `${await displayName(args.actorId)} declined your request`,
        body: `${listing.title} — ${swap.points} SP`,
        link: `/swaps/${swap.id}`,
      },
    ]);
  });
}

/** Either side confirms the hand-over has happened and the Swop is running. */
export async function startSwap(args: { actorId: string; swapId: string }) {
  const context = await loadSwapContext(args.swapId);
  if (!context) throw new SwapError("Swop not found.");
  const { swap } = context;

  if (swap.providerId !== args.actorId && swap.requesterId !== args.actorId) {
    throw new SwapError("This is not your Swop.");
  }
  if (swap.status !== "ACCEPTED") {
    throw new SwapError("This Swop cannot be started right now.");
  }

  await db
    .update(swaps)
    .set({ status: "ACTIVE" })
    .where(and(eq(swaps.id, swap.id), eq(swaps.status, "ACCEPTED")));
}

/* -------------------------------------------------------------- completing */

/**
 * Both members confirm separately. The second confirmation settles the points
 * inside one database transaction, so a Swop can never pay out twice or pay
 * out halfway. The unique ledger index and the wallet CHECK constraint are the
 * hard guarantees behind this.
 */
export async function confirmCompletion(args: { actorId: string; swapId: string }) {
  const context = await loadSwapContext(args.swapId);
  if (!context) throw new SwapError("Swop not found.");
  const { swap, listing } = context;

  const role: SwapRole | null =
    swap.providerId === args.actorId
      ? "provider"
      : swap.requesterId === args.actorId
        ? "requester"
        : null;
  if (!role) throw new SwapError("This is not your Swop.");

  if (swap.status === "COMPLETED") {
    throw new SwapError("This Swop is already complete.");
  }
  if (swap.status !== "ACTIVE" && swap.status !== "COMPLETION_PENDING") {
    throw new SwapError("This Swop cannot be completed yet.");
  }
  if (role === "provider" ? swap.providerConfirmedAt : swap.requesterConfirmedAt) {
    throw new SwapError("You have already confirmed this Swop.");
  }

  const otherId = role === "provider" ? swap.requesterId : swap.providerId;
  const now = new Date();

  const settled = await db.transaction(async (tx) => {
    // Re-read under a row lock so two simultaneous confirmations cannot both
    // believe they are the second one.
    const locked = await tx.execute(
      sql`SELECT status, provider_confirmed_at, requester_confirmed_at
          FROM swaps WHERE id = ${swap.id} FOR UPDATE`,
    );
    const current = locked.rows[0] as
      | {
          status: string;
          provider_confirmed_at: Date | null;
          requester_confirmed_at: Date | null;
        }
      | undefined;

    if (!current || current.status === "COMPLETED") {
      throw new SwapError("This Swop is already complete.");
    }

    const providerConfirmed =
      role === "provider" ? now : current.provider_confirmed_at;
    const requesterConfirmed =
      role === "requester" ? now : current.requester_confirmed_at;
    const bothConfirmed = Boolean(providerConfirmed && requesterConfirmed);

    await tx
      .update(swaps)
      .set({
        providerConfirmedAt: providerConfirmed,
        requesterConfirmedAt: requesterConfirmed,
        status: bothConfirmed ? "COMPLETED" : "COMPLETION_PENDING",
        completedAt: bothConfirmed ? now : null,
      })
      .where(eq(swaps.id, swap.id));

    if (!bothConfirmed) {
      await notify(tx, [
        {
          userId: otherId,
          type: "SWAP_COMPLETION_REQUESTED",
          title: `${await displayName(args.actorId)} marked a Swop as done`,
          body: `${listing.title} — confirm to release ${swap.points} SP.`,
          link: `/swaps/${swap.id}`,
        },
      ]);
      return false;
    }

    await settleSwap(tx, {
      swapId: swap.id,
      providerId: swap.providerId,
      requesterId: swap.requesterId,
      points: swap.points,
      listingTitle: listing.title,
    });

    await notify(tx, [
      {
        userId: swap.providerId,
        type: "POINTS_RECEIVED",
        title: `You earned ${swap.points} SP`,
        body: listing.title,
        link: "/wallet",
      },
      {
        userId: swap.requesterId,
        type: "SWAP_COMPLETED",
        title: "Swop complete",
        body: `${listing.title} — ${swap.points} SP transferred.`,
        link: `/swaps/${swap.id}`,
      },
    ]);

    return true;
  });

  if (settled) {
    await awardBadges([swap.providerId, swap.requesterId]);
  }
  return settled;
}

export async function cancelSwap(args: { actorId: string; swapId: string }) {
  const context = await loadSwapContext(args.swapId);
  if (!context) throw new SwapError("Swop not found.");
  const { swap, listing } = context;

  if (swap.providerId !== args.actorId && swap.requesterId !== args.actorId) {
    throw new SwapError("This is not your Swop.");
  }
  if (!(OPEN_STATUSES as readonly string[]).includes(swap.status)) {
    throw new SwapError("This Swop can no longer be cancelled.");
  }
  if (swap.status === "COMPLETED") {
    throw new SwapError("A completed Swop cannot be cancelled.");
  }

  const otherId = swap.providerId === args.actorId ? swap.requesterId : swap.providerId;

  await db.transaction(async (tx) => {
    const result = await tx
      .update(swaps)
      .set({ status: "CANCELLED", closedAt: new Date() })
      .where(and(eq(swaps.id, swap.id), inArray(swaps.status, [...OPEN_STATUSES])))
      .returning({ id: swaps.id });

    if (result.length === 0) throw new SwapError("This Swop can no longer be cancelled.");

    await notify(tx, [
      {
        userId: otherId,
        type: "SWAP_CANCELLED",
        title: `${await displayName(args.actorId)} cancelled a Swop`,
        body: listing.title,
        link: `/swaps/${swap.id}`,
      },
    ]);
  });
}

/* ------------------------------------------------------------------ reads */

export async function getSwapsForUser(userId: string) {
  return db
    .select({
      swap: swaps,
      listing: listings,
      providerName: profiles.displayName,
    })
    .from(swaps)
    .innerJoin(listings, eq(listings.id, swaps.listingId))
    .innerJoin(profiles, eq(profiles.userId, swaps.providerId))
    .where(or(eq(swaps.providerId, userId), eq(swaps.requesterId, userId)))
    .orderBy(sql`${swaps.createdAt} DESC`);
}
