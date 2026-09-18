import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE, type Role } from "@/lib/constants";
import { signToken, verifyToken, type SessionClaims } from "./tokens";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string, role: Role) {
  const token = await signToken({ kind: "session", userId, role }, "30d");
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken<SessionClaims>(token, "session");
}

/** Current user (deduplicated per request thanks to React cache). */
export const getCurrentUser = cache(async () => {
  const claims = await getSessionClaims();
  if (!claims) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: { id: true, email: true, name: true, role: true, plan: true, totalXp: true, createdAt: true },
  });
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) throw new AuthError("FORBIDDEN");
  return user;
}

/** Trainers and admins can author quizzes and host games. */
export async function requireTrainer(): Promise<CurrentUser> {
  return requireRole(["TRAINER", "ADMIN"]);
}
