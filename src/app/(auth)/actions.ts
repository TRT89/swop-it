"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, users, wallets, walletTransactions } from "@/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { loginSchema, signupSchema } from "@/lib/validation";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { rateLimit } from "@/lib/rate-limit";
import { WELCOME_BONUS } from "@/lib/points";

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { email, password, displayName, city, postalCode } = parsed.data;

  const limit = rateLimit(`signup:${email}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many sign-up attempts. Please try again later." };
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return { fieldErrors: { email: "That email is already registered." } };
  }

  const passwordHash = await hashPassword(password);

  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      // Verification is auto-granted in the prototype; the column is already
      // here so a real confirmation email can be added without a migration.
      .values({ email, passwordHash, emailVerified: true })
      .returning();

    await tx.insert(profiles).values({
      userId: user!.id,
      displayName,
      city,
      postalCode,
    });
    await tx.insert(wallets).values({ userId: user!.id, balance: WELCOME_BONUS });
    await tx.insert(walletTransactions).values({
      userId: user!.id,
      type: "WELCOME_BONUS",
      amount: WELCOME_BONUS,
      description: "Welcome to Swop-it",
    });

    return user!.id;
  });

  await createSession(userId);
  redirect("/dashboard?welcome=1");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const { email, password } = parsed.data;

  const limit = rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Same message either way so the form cannot be used to discover accounts.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email or password is not correct." };
  }
  if (!user.isActive) {
    return { error: "This account has been deactivated. Please contact support." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
