import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getPlayerSession } from "@/lib/game/player-access";
import { jokerEffects } from "@/lib/game/engine";

export const dynamic = "force-dynamic";

export type MeView = {
  playerId: string;
  nickname: string;
  score: number;
  streak: number;
  bestStreak: number;
  jokers: { type: string; remaining: number; usedOnId: string | null }[];
  effects: { hiddenAnswerIds: string[]; extraMs: number; doublePoints: boolean; secondChance: boolean };
  currentAnswer: { gameQuestionId: string; answerId: string | null; isCorrect: boolean; pointsAwarded: number; attempts: number; basePoints: number; speedBonus: number; streakBonus: number; multiplier: number; penalty: number; responseMs: number } | null;
};

/** Private state of the calling player (own answer for the current question, jokers). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/games/[id]/me">) {
  const { id: gameId } = await ctx.params;
  const player = await getPlayerSession(gameId);
  if (!player) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { currentIndex: true } });
  const gq = game && game.currentIndex >= 0 ? await prisma.gameQuestion.findUnique({ where: { gameId_order: { gameId, order: game.currentIndex } }, select: { id: true } }) : null;
  const [jokers, answer, effects] = await Promise.all([
    prisma.playerJoker.findMany({ where: { gamePlayerId: player.id } }),
    gq ? prisma.playerAnswer.findUnique({ where: { gamePlayerId_gameQuestionId: { gamePlayerId: player.id, gameQuestionId: gq.id } } }) : null,
    jokerEffects(player.id, gq?.id ?? null),
  ]);
  const view: MeView = {
    playerId: player.id,
    nickname: player.nickname,
    score: player.score,
    streak: player.streak,
    bestStreak: player.bestStreak,
    jokers: jokers.map((j) => ({ type: j.type, remaining: j.remaining, usedOnId: j.usedOnId })),
    effects,
    currentAnswer: answer
      ? {
          gameQuestionId: answer.gameQuestionId,
          answerId: answer.answerId,
          isCorrect: answer.isCorrect,
          pointsAwarded: answer.pointsAwarded,
          attempts: answer.attempts,
          basePoints: answer.basePoints,
          speedBonus: answer.speedBonus,
          streakBonus: answer.streakBonus,
          multiplier: answer.multiplier,
          penalty: answer.penalty,
          responseMs: answer.responseMs,
        }
      : null,
  };
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
