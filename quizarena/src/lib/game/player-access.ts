import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { PLAYER_COOKIE } from "@/lib/constants";
import { signToken, verifyToken, type PlayerClaims } from "@/lib/auth/tokens";

export function playerCookieName(gameId: string) {
  return `${PLAYER_COOKIE}_${gameId}`;
}

export async function grantPlayerCookie(gameId: string, playerId: string, sessionToken: string) {
  const token = await signToken({ kind: "player", gameId, playerId, token: sessionToken }, "12h");
  const store = await cookies();
  store.set(playerCookieName(gameId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

/** Resolve the player behind the request for a given game (single session per player). */
export async function getPlayerSession(gameId: string) {
  const store = await cookies();
  const raw = store.get(playerCookieName(gameId))?.value;
  if (!raw) return null;
  const claims = await verifyToken<PlayerClaims>(raw, "player");
  if (!claims || claims.gameId !== gameId) return null;
  const player = await prisma.gamePlayer.findUnique({ where: { id: claims.playerId }, include: { team: true } });
  if (!player || player.gameId !== gameId || player.sessionToken !== claims.token) return null;
  return player;
}

export type PlayerSession = NonNullable<Awaited<ReturnType<typeof getPlayerSession>>>;
