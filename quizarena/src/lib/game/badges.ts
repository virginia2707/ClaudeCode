import "server-only";
import { prisma } from "@/lib/db/prisma";
import { track } from "@/lib/analytics";
import { parseBadgeCriteria, type BadgeCriteria } from "./badge-criteria";

export type PlayerBadgeContext = {
  gamePlayerId: string;
  userId: string | null;
  rank: number;
  previousRank: number | null;
  correctCount: number;
  answeredCount: number;
  bestStreak: number;
  avgResponseMs: number;
  teamId: string | null;
  isFirstWinForUser: boolean;
};

export type GameBadgeContext = {
  totalQuestions: number;
  totalPlayers: number;
  mode: "INDIVIDUAL" | "TEAM";
  winningTeamId: string | null;
  fastestPlayerId: string | null;
};

/** Pure predicate: does this player satisfy this criterion in this game? Fully unit-testable. */
export function matchesCriteria(criteria: BadgeCriteria, player: PlayerBadgeContext, game: GameBadgeContext): boolean {
  switch (criteria.type) {
    case "rank":
      return player.rank <= criteria.max && game.totalPlayers >= criteria.minPlayers;
    case "first_win":
      return player.rank === 1 && player.userId !== null && player.isFirstWinForUser;
    case "accuracy": {
      if (player.answeredCount === 0) return false;
      if (criteria.requireAllAnswered && player.answeredCount !== game.totalQuestions) return false;
      return player.correctCount / player.answeredCount >= criteria.min;
    }
    case "all_answered":
      return game.totalQuestions > 0 && player.answeredCount === game.totalQuestions;
    case "streak":
      return player.bestStreak >= criteria.min;
    case "avg_response_ms":
      return player.answeredCount > 0 && player.avgResponseMs <= criteria.max;
    case "fastest_in_game":
      return game.totalPlayers >= criteria.minPlayers && game.fastestPlayerId === player.gamePlayerId;
    case "comeback":
      return player.previousRank !== null && player.previousRank - player.rank >= criteria.minRankGain;
    case "winning_team":
      return game.mode === "TEAM" && player.teamId !== null && player.teamId === game.winningTeamId;
    default:
      return false;
  }
}

/** Evaluate every active badge for one player; returns the codes newly earned. */
export function evaluateBadges(
  badges: { code: string; criteria: BadgeCriteria }[],
  player: PlayerBadgeContext,
  game: GameBadgeContext,
): string[] {
  return badges.filter((b) => matchesCriteria(b.criteria, player, game)).map((b) => b.code);
}

/**
 * Award badges for a finished game. Idempotent (unique on badgeId+gamePlayerId).
 * Must run after GameResult rows exist (rank, accuracy, bestStreak).
 */
export async function awardBadges(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { mode: true } });
  if (!game) return;

  const [badgeRows, totalQuestions, teams, results] = await Promise.all([
    prisma.badge.findMany(),
    prisma.gameQuestion.count({ where: { gameId } }),
    prisma.team.findMany({ where: { gameId }, select: { id: true, score: true } }),
    prisma.gameResult.findMany({
      where: { gameId },
      include: { player: { select: { id: true, userId: true, teamId: true, previousRank: true } } },
    }),
  ]);

  const badges = badgeRows
    .map((b) => ({ code: b.code, id: b.id, criteria: parseBadgeCriteria(b.criteria) }))
    .filter((b): b is { code: string; id: string; criteria: BadgeCriteria } => b.criteria !== null);
  if (badges.length === 0 || results.length === 0) return;

  const winningTeamId = game.mode === "TEAM" && teams.length ? teams.reduce((a, b) => (b.score > a.score ? b : a)).id : null;
  const withSpeed = results.filter((r) => r.answeredCount > 0);
  const fastestPlayerId = withSpeed.length
    ? withSpeed.reduce((a, b) => (b.avgResponseMs < a.avgResponseMs ? b : a)).gamePlayerId
    : null;

  // First-win lookups only matter for signed-in candidates ranked first.
  const winnerUserIds = Array.from(new Set(results.filter((r) => r.rank === 1 && r.player.userId).map((r) => r.player.userId as string)));
  const priorWins = winnerUserIds.length
    ? await prisma.gameResult.findMany({
        where: { rank: 1, gameId: { not: gameId }, player: { userId: { in: winnerUserIds } } },
        select: { player: { select: { userId: true } } },
      })
    : [];
  const hasPriorWin = new Set(priorWins.map((p) => p.player.userId));

  const gameCtx: GameBadgeContext = {
    totalQuestions,
    totalPlayers: results.length,
    mode: game.mode as "INDIVIDUAL" | "TEAM",
    winningTeamId,
    fastestPlayerId,
  };

  const writes: Promise<unknown>[] = [];
  for (const r of results) {
    const playerCtx: PlayerBadgeContext = {
      gamePlayerId: r.gamePlayerId,
      userId: r.player.userId,
      rank: r.rank,
      previousRank: r.player.previousRank,
      correctCount: r.correctCount,
      answeredCount: r.answeredCount,
      bestStreak: r.bestStreak,
      avgResponseMs: r.avgResponseMs,
      teamId: r.player.teamId,
      isFirstWinForUser: r.player.userId ? !hasPriorWin.has(r.player.userId) : false,
    };
    const earned = evaluateBadges(badges, playerCtx, gameCtx);
    for (const code of earned) {
      const badge = badges.find((b) => b.code === code)!;
      writes.push(
        prisma.playerBadge
          .upsert({
            where: { badgeId_gamePlayerId: { badgeId: badge.id, gamePlayerId: r.gamePlayerId } },
            update: {},
            create: { badgeId: badge.id, gamePlayerId: r.gamePlayerId, userId: r.player.userId },
          })
          .then(() => track("badge_unlocked", { userId: r.player.userId, gameId, payload: { code } })),
      );
    }
  }
  await Promise.all(writes);
}
