import "server-only";
import { prisma } from "@/lib/prisma";
import type { GameStatus } from "@/lib/constants";

export const gameListSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  category: true,
  level: true,
  difficulty: true,
  estimatedMinutes: true,
  mode: true,
  status: true,
  isDemo: true,
  coverImageUrl: true,
  updatedAt: true,
  publishedAt: true,
  _count: { select: { steps: true, sessions: true } },
} as const;

export type GameListItem = Awaited<ReturnType<typeof listGamesForOwner>>[number];

export async function listGamesForOwner(ownerId: string, status?: GameStatus | "ALL") {
  return prisma.escapeGame.findMany({
    where: { ownerId, ...(status && status !== "ALL" ? { status } : {}) },
    select: gameListSelect,
    orderBy: { updatedAt: "desc" },
  });
}

export async function countGamesByStatus(ownerId: string) {
  const rows = await prisma.escapeGame.groupBy({ by: ["status"], where: { ownerId }, _count: { _all: true } });
  const out: Record<string, number> = { ALL: 0, DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 };
  for (const r of rows) {
    out[r.status] = r._count._all;
    out.ALL += r._count._all;
  }
  return out;
}

/** Jeu complet (étapes, énigmes, réponses, indices, compétences, réglages) appartenant à l'utilisateur. */
export async function getOwnedGame(gameId: string, ownerId: string, options?: { allowAdmin?: boolean; role?: string }) {
  const where = options?.allowAdmin && options.role === "ADMIN" ? { id: gameId } : { id: gameId, ownerId };
  return prisma.escapeGame.findFirst({
    where,
    include: {
      settings: true,
      steps: {
        orderBy: { order: "asc" },
        include: {
          puzzle: {
            include: {
              answers: { orderBy: { createdAt: "asc" } },
              hints: { orderBy: { order: "asc" } },
              skills: { include: { skill: true } },
            },
          },
        },
      },
      _count: { select: { sessions: true } },
    },
  });
}

export type OwnedGame = NonNullable<Awaited<ReturnType<typeof getOwnedGame>>>;

export async function dashboardStats(ownerId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [games, sessionsThisMonth, participants, recentGames, recentSessions] = await Promise.all([
    prisma.escapeGame.count({ where: { ownerId, status: { not: "ARCHIVED" } } }),
    prisma.gameSession.count({ where: { hostId: ownerId, createdAt: { gte: monthStart } } }),
    prisma.sessionPlayer.count({ where: { session: { hostId: ownerId } } }),
    prisma.escapeGame.findMany({ where: { ownerId }, select: gameListSelect, orderBy: { updatedAt: "desc" }, take: 4 }),
    prisma.gameSession.findMany({
      where: { hostId: ownerId },
      select: { id: true, code: true, status: true, createdAt: true, game: { select: { title: true } }, _count: { select: { players: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { games, sessionsThisMonth, participants, recentGames, recentSessions };
}
