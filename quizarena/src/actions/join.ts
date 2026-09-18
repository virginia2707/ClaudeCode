"use server";

import { redirect } from "next/navigation";
import { joinGame, JoinError } from "@/lib/game/join";
import { grantPlayerCookie } from "@/lib/game/player-access";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeCode } from "@/lib/game/code";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/action-state";

export async function joinGameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  const rl = rateLimit(`join:${ip}`, 30, 5 * 60 * 1000);
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const nickname = String(formData.get("nickname") ?? "");
  const teamId = String(formData.get("teamId") ?? "") || null;
  const values = { code, nickname, teamId: teamId ?? "" };
  if (!rl.ok) return { error: "Trop de tentatives. Réessayez dans un instant.", values };

  const user = await getCurrentUser();
  let gameId: string;
  try {
    const { game, player } = await joinGame({ code, nickname, teamId, userId: user?.id });
    await grantPlayerCookie(game.id, player.id, player.sessionToken);
    gameId = game.id;
  } catch (err) {
    if (err instanceof JoinError) {
      // Team mode without a team chosen: reload the form with the code so teams are listed.
      if (err.field === "teamId" && !formData.get("teamsShown")) redirect(`/join?code=${encodeURIComponent(code)}&nickname=${encodeURIComponent(nickname)}`);
      return err.field === "_" ? { error: err.message, values } : { fieldErrors: { [err.field]: err.message }, values };
    }
    throw err;
  }
  redirect(`/play/${gameId}`);
}
