import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { HOST_COOKIE_PREFIX } from "./host-access";
import { getPlayerSession } from "./player-access";

export type Viewer = { role: "host"; userId: string | null } | { role: "player"; playerId: string } | null;

/** Identify who is watching a game: its host (owner/admin/demo cookie) or a joined player. */
export async function identifyViewer(gameId: string): Promise<Viewer> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { hostId: true, hostToken: true } });
  if (!game) return null;
  const user = await getCurrentUser();
  if (user && (game.hostId === user.id || user.role === "ADMIN")) return { role: "host", userId: user.id };
  if (game.hostToken) {
    const store = await cookies();
    if (store.get(`${HOST_COOKIE_PREFIX}${gameId}`)?.value === game.hostToken) return { role: "host", userId: null };
  }
  const player = await getPlayerSession(gameId);
  if (player) return { role: "player", playerId: player.id };
  return null;
}
