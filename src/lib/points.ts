import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { walletTransactions, wallets } from "@/db/schema";

export const WELCOME_BONUS = 50;

export class PointsError extends Error {}

/**
 * A ledger write always needs a transaction handle, never the top-level `db`.
 * The two statements below must succeed or fail together: without that, a
 * rejected balance update would leave an orphaned ledger row behind.
 */
export type LedgerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type LedgerEntry = {
  userId: string;
  swapId?: string | null;
  type: (typeof walletTransactions.$inferInsert)["type"];
  amount: number;
  description: string;
};

/**
 * The only sanctioned way to move Social Points.
 *
 * Writes an immutable ledger row and rolls the cached wallet balance forward in
 * the *same* statement pair, inside the caller's database transaction. A CHECK
 * constraint on wallets.balance rejects anything that would go below zero, so a
 * user can never spend points they do not have.
 */
export async function postLedgerEntry(tx: LedgerTx, entry: LedgerEntry) {
  if (!Number.isInteger(entry.amount) || entry.amount === 0) {
    throw new PointsError("Ledger amount must be a non-zero integer");
  }

  await tx.insert(walletTransactions).values({
    userId: entry.userId,
    swapId: entry.swapId ?? null,
    type: entry.type,
    amount: entry.amount,
    description: entry.description,
  });

  const [wallet] = await tx
    .update(wallets)
    .set({ balance: sql`${wallets.balance} + ${entry.amount}` })
    .where(eq(wallets.userId, entry.userId))
    .returning();

  if (!wallet) throw new PointsError("Wallet not found");
  return wallet;
}

/**
 * Settles a completed swap: the requester pays, the provider earns.
 * The unique index on (swap_id, user_id, type) means a second call for the same
 * swap raises instead of paying out twice.
 */
export async function settleSwap(
  tx: LedgerTx,
  args: {
    swapId: string;
    providerId: string;
    requesterId: string;
    points: number;
    listingTitle: string;
  },
) {
  if (args.points < 0) throw new PointsError("A swap cannot cost negative points");
  if (args.points === 0) return;

  await postLedgerEntry(tx, {
    userId: args.requesterId,
    swapId: args.swapId,
    type: "SWAP_SPENT",
    amount: -args.points,
    description: args.listingTitle,
  });

  await postLedgerEntry(tx, {
    userId: args.providerId,
    swapId: args.swapId,
    type: "SWAP_EARNED",
    amount: args.points,
    description: args.listingTitle,
  });
}

/** Posts a single stand-alone entry (welcome bonus, admin adjustment, bonus). */
export async function creditPoints(entry: LedgerEntry) {
  return db.transaction((tx) => postLedgerEntry(tx, entry));
}

export async function getBalance(userId: string): Promise<number> {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId));
  return wallet?.balance ?? 0;
}

export async function getWalletSummary(userId: string) {
  const [row] = await db
    .select({
      balance: sql<number>`coalesce(max(${wallets.balance}), 0)::int`,
      earned: sql<number>`coalesce(sum(case when ${walletTransactions.amount} > 0 then ${walletTransactions.amount} else 0 end), 0)::int`,
      spent: sql<number>`coalesce(sum(case when ${walletTransactions.amount} < 0 then ${walletTransactions.amount} else 0 end), 0)::int`,
    })
    .from(wallets)
    .leftJoin(
      walletTransactions,
      eq(walletTransactions.userId, wallets.userId),
    )
    .where(eq(wallets.userId, userId));

  return row ?? { balance: 0, earned: 0, spent: 0 };
}

/** True when this swap has already been settled. */
export async function isSwapSettled(swapId: string) {
  const [row] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.swapId, swapId),
        eq(walletTransactions.type, "SWAP_EARNED"),
      ),
    );
  return Boolean(row);
}
