// Signed tokens (JWT HS256 via jose). Works in both the Node and Edge runtimes.
// Two token kinds share the secret but carry a distinct `kind` claim so a
// player token can never be replayed as a trainer session and vice-versa.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 8) {
    throw new Error("AUTH_SECRET environment variable is missing or too short");
  }
  return new TextEncoder().encode(raw);
}

export type SessionClaims = { kind: "session"; userId: string; role: string };
export type PlayerClaims = { kind: "player"; gameId: string; playerId: string; token: string };

export async function signToken(claims: SessionClaims | PlayerClaims, expiresIn: string): Promise<string> {
  return new SignJWT(claims as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken<T extends SessionClaims | PlayerClaims>(token: string, kind: T["kind"]): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.kind !== kind) return null;
    return payload as unknown as T;
  } catch {
    return null;
  }
}
