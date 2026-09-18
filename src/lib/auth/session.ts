import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, type Role } from "@/lib/constants";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 jours

export type SessionPayload = { sub: string; role: Role; v: number };

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: SESSION_TTL_SECONDS, issuer: "escapeclass" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string, { issuer: "escapeclass" }) as SessionPayload;
    if (!decoded?.sub || !decoded?.role) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function createSession(user: { id: string; role: string }) {
  const token = signSession({ sub: user.id, role: user.role as Role, v: 1 });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
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
  return verifySessionToken(token);
}

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  plan: string;
  avatarUrl: string | null;
};

const userSelect = { id: true, email: true, firstName: true, lastName: true, role: true, plan: true, avatarUrl: true, isActive: true } as const;

/** Utilisateur courant (null si non connecté, désactivé ou introuvable). Le rôle est relu en base, jamais depuis le cookie seul. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSessionPayload();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: userSelect });
  if (!user || !user.isActive) return null;
  const { isActive: _ignored, ...rest } = user;
  void _ignored;
  return { ...rest, role: rest.role as Role };
}

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN") {
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
  if (!roles.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

/** Page d'accueil selon le rôle. */
export function homeForRole(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TRAINER":
      return "/app";
    default:
      return "/join";
  }
}
