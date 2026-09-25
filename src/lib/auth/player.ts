import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { PLAYER_COOKIE } from "@/lib/constants";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");

/**
 * Jeton de participant : lie un navigateur à un SessionPlayer précis.
 * Les apprenants n'ont pas de compte ; ce jeton signé est leur identité
 * pour la durée de la session.
 */
export type PlayerToken = { sid: string; pid: string; v: number };

export function signPlayerToken(payload: PlayerToken) {
  return jwt.sign(payload, JWT_SECRET as string, { algorithm: "HS256", expiresIn: "12h", issuer: "escapeclass-player" });
}

export function verifyPlayerToken(token: string): PlayerToken | null {
  try {
    // Algorithme épinglé : un jeton signé autrement est rejeté.
    const decoded = jwt.verify(token, JWT_SECRET as string, { algorithms: ["HS256"], issuer: "escapeclass-player" }) as PlayerToken;
    return decoded?.sid && decoded?.pid ? decoded : null;
  } catch {
    return null;
  }
}

const cookieName = (sessionId: string) => `${PLAYER_COOKIE}_${sessionId.slice(0, 12)}`;

export async function setPlayerCookie(sessionId: string, playerId: string) {
  const store = await cookies();
  store.set(cookieName(sessionId), signPlayerToken({ sid: sessionId, pid: playerId, v: 1 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getPlayerToken(sessionId: string): Promise<PlayerToken | null> {
  const store = await cookies();
  const raw = store.get(cookieName(sessionId))?.value;
  if (!raw) return null;
  const token = verifyPlayerToken(raw);
  if (!token || token.sid !== sessionId) return null;
  return token;
}

export async function clearPlayerCookie(sessionId: string) {
  const store = await cookies();
  store.delete(cookieName(sessionId));
}
