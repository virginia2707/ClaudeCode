import "server-only";
import { prisma } from "@/lib/db/prisma";

/**
 * Game engine — Phase 5 stub. The full state machine (start, next question,
 * automatic question close, reveal, leaderboard, finish) arrives in Phase 6.
 * `reconcileGame` is the lazy safety net called on every read: it closes a
 * question whose server deadline has passed.
 */
export async function reconcileGame(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { status: true, questionEndsAt: true } });
  if (!game) return;
  // Nothing to reconcile before the engine exists.
  void game;
}
