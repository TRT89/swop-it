import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { swaps } from "@/db/schema";
import {
  SwapError,
  cancelSwap,
  confirmCompletion,
  requestSwap,
  respondToSwap,
  startSwap,
} from "@/lib/swap-service";
import { creditPoints } from "@/lib/points";
import {
  balanceOf,
  ledgerRowsFor,
  makeCategory,
  makeListing,
  makeUser,
  resetDatabase,
} from "./helpers";

/** Drives a Swop from request all the way to both-sides-confirmed. */
async function runToActive(args: {
  providerId: string;
  requesterId: string;
  listingId: string;
}) {
  const swapId = await requestSwap({
    actorId: args.requesterId,
    listingId: args.listingId,
  });
  await respondToSwap({
    actorId: args.providerId,
    swapId,
    decision: "ACCEPTED",
  });
  await startSwap({ actorId: args.providerId, swapId });
  return swapId;
}

describe("Swop lifecycle", () => {
  let tobias: string;
  let anna: string;
  let categoryId: string;
  let listingId: string;

  beforeEach(async () => {
    await resetDatabase();
    tobias = await makeUser("Tobias");
    anna = await makeUser("Anna");
    categoryId = await makeCategory();
    listingId = await makeListing({ ownerId: tobias, categoryId, points: 15 });
  });

  it("transfers Social Points only once both members confirm", async () => {
    const swapId = await runToActive({ providerId: tobias, requesterId: anna, listingId });

    // First confirmation: nothing moves yet.
    const settledFirst = await confirmCompletion({ actorId: anna, swapId });
    expect(settledFirst).toBe(false);
    expect((await balanceOf(anna)).balance).toBe(50);
    expect((await balanceOf(tobias)).balance).toBe(50);

    const [pending] = await db.select().from(swaps).where(eq(swaps.id, swapId));
    expect(pending!.status).toBe("COMPLETION_PENDING");

    // Second confirmation settles it.
    const settledSecond = await confirmCompletion({ actorId: tobias, swapId });
    expect(settledSecond).toBe(true);

    expect((await balanceOf(anna)).balance).toBe(35);
    expect((await balanceOf(tobias)).balance).toBe(65);

    const [completed] = await db.select().from(swaps).where(eq(swaps.id, swapId));
    expect(completed!.status).toBe("COMPLETED");
    expect(completed!.completedAt).not.toBeNull();
  });

  it("writes exactly one debit and one credit for a completed Swop", async () => {
    const swapId = await runToActive({ providerId: tobias, requesterId: anna, listingId });
    await confirmCompletion({ actorId: anna, swapId });
    await confirmCompletion({ actorId: tobias, swapId });

    const rows = await ledgerRowsFor(swapId);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.user_id === anna)).toMatchObject({
      type: "SWAP_SPENT",
      amount: -15,
    });
    expect(rows.find((r) => r.user_id === tobias)).toMatchObject({
      type: "SWAP_EARNED",
      amount: 15,
    });
  });

  it("never transfers points twice for the same Swop", async () => {
    const swapId = await runToActive({ providerId: tobias, requesterId: anna, listingId });
    await confirmCompletion({ actorId: anna, swapId });
    await confirmCompletion({ actorId: tobias, swapId });

    // Both members try again after it is already complete.
    await expect(confirmCompletion({ actorId: anna, swapId })).rejects.toBeInstanceOf(SwapError);
    await expect(confirmCompletion({ actorId: tobias, swapId })).rejects.toBeInstanceOf(SwapError);

    expect(await ledgerRowsFor(swapId)).toHaveLength(2);
    expect((await balanceOf(anna)).balance).toBe(35);
    expect((await balanceOf(tobias)).balance).toBe(65);
  });

  it("rejects a second confirmation from the same member", async () => {
    const swapId = await runToActive({ providerId: tobias, requesterId: anna, listingId });
    await confirmCompletion({ actorId: anna, swapId });

    await expect(confirmCompletion({ actorId: anna, swapId })).rejects.toThrow(
      /already confirmed/i,
    );
    expect(await ledgerRowsFor(swapId)).toHaveLength(0);
  });

  it("keeps balance and ledger in step after settlement", async () => {
    const swapId = await runToActive({ providerId: tobias, requesterId: anna, listingId });
    await confirmCompletion({ actorId: anna, swapId });
    await confirmCompletion({ actorId: tobias, swapId });

    for (const userId of [anna, tobias]) {
      const { balance, ledger } = await balanceOf(userId);
      expect(balance).toBe(ledger);
    }
  });

  it("refuses a request the member cannot afford", async () => {
    const expensive = await makeListing({
      ownerId: tobias,
      categoryId,
      points: 80,
      title: "Very expensive drill",
    });

    await expect(
      requestSwap({ actorId: anna, listingId: expensive }),
    ).rejects.toThrow(/50 SP but this Swop costs 80 SP/);
  });

  it("blocks settlement when the payer's balance ran out after the request", async () => {
    const swapId = await runToActive({ providerId: tobias, requesterId: anna, listingId });

    // Anna spends her points elsewhere while the Swop is running.
    await creditPoints({
      userId: anna,
      type: "ADMIN_ADJUSTMENT",
      amount: -45,
      description: "Spent elsewhere",
    });
    expect((await balanceOf(anna)).balance).toBe(5);

    await confirmCompletion({ actorId: anna, swapId });
    await expect(confirmCompletion({ actorId: tobias, swapId })).rejects.toThrow();

    // Nothing partial: no ledger rows, no credit to the provider, still open.
    expect(await ledgerRowsFor(swapId)).toHaveLength(0);
    expect((await balanceOf(tobias)).balance).toBe(50);
    expect((await balanceOf(anna)).balance).toBe(5);

    const [row] = await db.select().from(swaps).where(eq(swaps.id, swapId));
    expect(row!.status).not.toBe("COMPLETED");
  });

  it("does not move points for a cancelled Swop", async () => {
    const swapId = await runToActive({ providerId: tobias, requesterId: anna, listingId });
    await cancelSwap({ actorId: anna, swapId });

    await expect(confirmCompletion({ actorId: anna, swapId })).rejects.toBeInstanceOf(SwapError);
    expect(await ledgerRowsFor(swapId)).toHaveLength(0);
    expect((await balanceOf(anna)).balance).toBe(50);
    expect((await balanceOf(tobias)).balance).toBe(50);
  });

  it("does not move points for a declined request", async () => {
    const swapId = await requestSwap({ actorId: anna, listingId });
    await respondToSwap({ actorId: tobias, swapId, decision: "DECLINED" });

    await expect(startSwap({ actorId: tobias, swapId })).rejects.toBeInstanceOf(SwapError);
    expect(await ledgerRowsFor(swapId)).toHaveLength(0);
    expect((await balanceOf(anna)).balance).toBe(50);
  });

  it("stops a member requesting their own listing", async () => {
    await expect(
      requestSwap({ actorId: tobias, listingId }),
    ).rejects.toThrow(/your own listing/i);
  });

  it("stops a duplicate open request for the same listing", async () => {
    await requestSwap({ actorId: anna, listingId });
    await expect(requestSwap({ actorId: anna, listingId })).rejects.toThrow(
      /already have an open Swop/i,
    );
  });

  it("pays the provider on a REQUEST listing, where the owner is the one paying", async () => {
    // Anna posts a request; Tobias answers it, so Tobias earns and Anna pays.
    const requestListing = await makeListing({
      ownerId: anna,
      categoryId,
      points: 20,
      type: "REQUEST",
      title: "Need help assembling a wardrobe",
    });

    const swapId = await requestSwap({ actorId: tobias, listingId: requestListing });
    const [swap] = await db.select().from(swaps).where(eq(swaps.id, swapId));
    expect(swap!.providerId).toBe(tobias);
    expect(swap!.requesterId).toBe(anna);

    // Anna owns the listing, so Anna is the one who accepts.
    await respondToSwap({ actorId: anna, swapId, decision: "ACCEPTED" });
    await startSwap({ actorId: anna, swapId });
    await confirmCompletion({ actorId: anna, swapId });
    await confirmCompletion({ actorId: tobias, swapId });

    expect((await balanceOf(tobias)).balance).toBe(70);
    expect((await balanceOf(anna)).balance).toBe(30);
  });
});

describe("Swop authorisation", () => {
  let tobias: string;
  let anna: string;
  let mark: string;
  let listingId: string;

  beforeEach(async () => {
    await resetDatabase();
    tobias = await makeUser("Tobias");
    anna = await makeUser("Anna");
    mark = await makeUser("Mark");
    const categoryId = await makeCategory();
    listingId = await makeListing({ ownerId: tobias, categoryId, points: 15 });
  });

  it("only lets the listing owner accept or decline", async () => {
    const swapId = await requestSwap({ actorId: anna, listingId });

    await expect(
      respondToSwap({ actorId: anna, swapId, decision: "ACCEPTED" }),
    ).rejects.toThrow(/only the member who posted the listing/i);

    await expect(
      respondToSwap({ actorId: mark, swapId, decision: "ACCEPTED" }),
    ).rejects.toThrow(/only the member who posted the listing/i);
  });

  it("refuses to answer a request twice", async () => {
    const swapId = await requestSwap({ actorId: anna, listingId });
    await respondToSwap({ actorId: tobias, swapId, decision: "ACCEPTED" });

    await expect(
      respondToSwap({ actorId: tobias, swapId, decision: "DECLINED" }),
    ).rejects.toThrow(/already been answered/i);
  });

  it("keeps outsiders away from a Swop they are not part of", async () => {
    const swapId = await requestSwap({ actorId: anna, listingId });
    await respondToSwap({ actorId: tobias, swapId, decision: "ACCEPTED" });

    await expect(startSwap({ actorId: mark, swapId })).rejects.toThrow(/not your Swop/i);
    await expect(confirmCompletion({ actorId: mark, swapId })).rejects.toThrow(/not your Swop/i);
    await expect(cancelSwap({ actorId: mark, swapId })).rejects.toThrow(/not your Swop/i);
  });

  it("will not complete a Swop that was never started", async () => {
    const swapId = await requestSwap({ actorId: anna, listingId });

    await expect(confirmCompletion({ actorId: anna, swapId })).rejects.toThrow(
      /cannot be completed yet/i,
    );
    expect(await ledgerRowsFor(swapId)).toHaveLength(0);
  });

  it("will not cancel an already completed Swop", async () => {
    const swapId = await requestSwap({ actorId: anna, listingId });
    await respondToSwap({ actorId: tobias, swapId, decision: "ACCEPTED" });
    await startSwap({ actorId: tobias, swapId });
    await confirmCompletion({ actorId: anna, swapId });
    await confirmCompletion({ actorId: tobias, swapId });

    await expect(cancelSwap({ actorId: anna, swapId })).rejects.toBeInstanceOf(SwapError);
    expect((await balanceOf(anna)).balance).toBe(35);
  });
});
