"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { createGame, GameCreationError } from "@/lib/game/create";
import { grantDemoHostCookie } from "@/lib/game/host-access";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/action-state";
import { GAME_MODES } from "@/lib/constants";

export async function createGameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTrainer();
  const quizId = String(formData.get("quizId") ?? "");
  const modeRaw = String(formData.get("mode") ?? "");
  const mode = (GAME_MODES as readonly string[]).includes(modeRaw) ? (modeRaw as "INDIVIDUAL" | "TEAM") : undefined;
  await getOwnedQuiz(quizId, user);
  let gameId: string;
  try {
    const game = await createGame({ quizId, hostId: user.id, overrides: mode ? { mode } : undefined });
    gameId = game.id;
  } catch (err) {
    if (err instanceof GameCreationError) return { error: err.message };
    throw err;
  }
  redirect(`/games/${gameId}/host`);
}

/** Demo mode: anyone can start a game on the demo quiz without an account. */
export async function createDemoGameAction(): Promise<ActionState> {
  const ip = await clientIp();
  const rl = rateLimit(`demo:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return { error: "Trop de parties de démonstration créées. Réessayez dans quelques minutes." };
  const demoQuiz = await prisma.quiz.findFirst({ where: { isDemo: true, status: "PUBLISHED" } });
  if (!demoQuiz) return { error: "Aucun quiz de démonstration n'est disponible." };
  const game = await createGame({ quizId: demoQuiz.id, hostId: null, isDemo: true });
  if (game.hostToken) await grantDemoHostCookie(game.id, game.hostToken);
  redirect(`/games/${game.id}/host`);
}
