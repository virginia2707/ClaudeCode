"use server";

import { getHostedGame } from "@/lib/game/host-access";
import { advance, pauseGame, resumeGame, finishGame, abandonGame, EngineError } from "@/lib/game/engine";
import type { ActionState } from "@/lib/action-state";

async function run(gameId: string, fn: () => Promise<unknown>): Promise<ActionState> {
  await getHostedGame(gameId); // 404 unless host
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    if (err instanceof EngineError) return { error: err.message };
    throw err;
  }
}

export async function hostStartAction(gameId: string): Promise<ActionState> {
  return run(gameId, () => advance(gameId));
}
export async function hostNextAction(gameId: string): Promise<ActionState> {
  return run(gameId, () => advance(gameId));
}
export async function hostPauseAction(gameId: string): Promise<ActionState> {
  return run(gameId, () => pauseGame(gameId));
}
export async function hostResumeAction(gameId: string): Promise<ActionState> {
  return run(gameId, () => resumeGame(gameId));
}
export async function hostFinishAction(gameId: string): Promise<ActionState> {
  return run(gameId, () => finishGame(gameId));
}
export async function hostAbandonAction(gameId: string): Promise<ActionState> {
  return run(gameId, () => abandonGame(gameId));
}
