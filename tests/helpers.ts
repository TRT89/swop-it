import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { applyMigrations } from "@/db/migrate";
import {
  categories,
  listings,
  profiles,
  users,
  walletTransactions,
  wallets,
} from "@/db/schema";
import { WELCOME_BONUS } from "@/lib/points";

let migrated = false;

export async function resetDatabase() {
  if (!migrated) {
    await applyMigrations(db);
    migrated = true;
  }
  await db.execute(sql`
    TRUNCATE TABLE
      user_badges, badges, feedback, reports, notifications, swoppies, reviews,
      wallet_transactions, wallets, swaps, messages, conversation_members,
      conversations, listing_images, listings, categories, sessions, profiles, users
    RESTART IDENTITY CASCADE
  `);
}

export async function makeUser(name: string, balance = WELCOME_BONUS) {
  const [user] = await db
    .insert(users)
    .values({
      email: `${name.toLowerCase()}-${crypto.randomUUID()}@test.local`,
      passwordHash: "not-a-real-hash",
      emailVerified: true,
    })
    .returning();

  await db.insert(profiles).values({
    userId: user!.id,
    displayName: name,
    city: "Frankfurt am Main",
    postalCode: "60311",
    latitude: 50.1109,
    longitude: 8.6821,
  });

  await db.insert(wallets).values({ userId: user!.id, balance });
  if (balance !== 0) {
    await db.insert(walletTransactions).values({
      userId: user!.id,
      type: "WELCOME_BONUS",
      amount: balance,
      description: "Welcome to Swop-it",
    });
  }

  return user!.id;
}

export async function makeCategory(slug = "tools") {
  const [category] = await db
    .insert(categories)
    .values({ slug, name: "Tools", kind: "PRODUCT" })
    .returning();
  return category!.id;
}

export async function makeListing(args: {
  ownerId: string;
  categoryId: string;
  points: number;
  type?: "OFFER" | "REQUEST";
  title?: string;
}) {
  const [listing] = await db
    .insert(listings)
    .values({
      ownerId: args.ownerId,
      type: args.type ?? "OFFER",
      kind: "PRODUCT",
      categoryId: args.categoryId,
      title: args.title ?? "Bosch Pressure Washer",
      description: "A pressure washer for testing purposes.",
      pricePoints: args.points,
      priceUnit: "PER_DAY",
      city: "Frankfurt am Main",
      postalCode: "60311",
    })
    .returning();
  return listing!.id;
}

export async function balanceOf(userId: string) {
  const [row] = await db.execute<{ balance: number; ledger: number }>(sql`
    SELECT w.balance::int AS balance,
           COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE user_id = w.user_id), 0)::int AS ledger
    FROM wallets w WHERE w.user_id = ${userId}
  `).then((r) => r.rows);
  return row!;
}

export async function ledgerRowsFor(swapId: string) {
  const result = await db.execute<{ user_id: string; type: string; amount: number }>(sql`
    SELECT user_id, type, amount FROM wallet_transactions WHERE swap_id = ${swapId}
  `);
  return result.rows;
}
