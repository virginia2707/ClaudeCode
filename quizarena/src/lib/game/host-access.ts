import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export const HOST_COOKIE_PREFIX = "qa_host_";

/** Loads a game the current requester may host: its owner (or an admin), or the demo host cookie. */
export async function getHostedGame(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { quiz: { select: { id: true, title: true, description: true, ownerId: true } }, teams: { orderBy: { name: "asc" } } },
  });
  if (!game) notFound();

  const user = await getCurrentUser();
  if (user && (game.hostId === user.id || user.role === "ADMIN")) return { game, user };

  if (game.hostToken) {
    const store = await cookies();
    const token = store.get(`${HOST_COOKIE_PREFIX}${game.id}`)?.value;
    if (token && token === game.hostToken) return { game, user: null };
  }
  notFound();
}

export async function grantDemoHostCookie(gameId: string, hostToken: string) {
  const store = await cookies();
  store.set(`${HOST_COOKIE_PREFIX}${gameId}`, hostToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
}
