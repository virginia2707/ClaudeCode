import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";

const SESSION_COOKIE = "apprentice_session";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

type SessionPayload = { userId: string; role: RoleValue };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "30d" });
}

export async function createSession(payload: SessionPayload) {
  const token = signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSessionPayload();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireRole(roles: RoleValue[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as RoleValue)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
