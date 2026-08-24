import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, sessions, users, wallets } from "@/db/schema";

const COOKIE_NAME = "swopit_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ id, userId, expiresAt });

  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  store.delete(COOKIE_NAME);
}

export type CurrentUser = {
  id: string;
  email: string;
  role: "MEMBER" | "ADMIN";
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  balance: number;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const sessionId = store.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      emailVerified: users.emailVerified,
      isActive: users.isActive,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      city: profiles.city,
      postalCode: profiles.postalCode,
      latitude: profiles.latitude,
      longitude: profiles.longitude,
      balance: wallets.balance,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .innerJoin(wallets, eq(wallets.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));

  if (!row || !row.isActive) return null;
  const { isActive: _isActive, ...user } = row;
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
