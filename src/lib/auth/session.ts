import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "missionia_session";
export const ACTIVE_ORG_COOKIE = "missionia_org";
const SESSION_DAYS = 30;

export type SessionPayload = { sub: string; iat?: number; exp?: number };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET manquant ou trop court (16 caractères minimum). Voir .env.example.");
  }
  return s;
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId } satisfies SessionPayload, secret(), { expiresIn: `${SESSION_DAYS}d` });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded !== "object" || !decoded || typeof decoded.sub !== "string") return null;
    return decoded as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ACTIVE_ORG_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function setActiveOrganization(organizationId: string) {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function readActiveOrganization() {
  const store = await cookies();
  return store.get(ACTIVE_ORG_COOKIE)?.value ?? null;
}
