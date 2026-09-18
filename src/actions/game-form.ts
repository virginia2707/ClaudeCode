"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { getOwnedGame } from "@/lib/games/queries";
import { uniqueGameSlug } from "@/lib/games/slug";
import { canCreateGame } from "@/lib/plans-guard";
import { track } from "@/lib/analytics/track";
import { fieldErrors } from "@/lib/validation/auth";
import { formToObject, gameInfoSchema, gameSettingsSchema, parseTargetSkills } from "@/lib/validation/game";
import { ensureSkillsByName } from "@/actions/skills";
import type { ActionResult } from "@/lib/action-result";

export type GameFormState = ActionResult & { values?: Record<string, string> };

function stringValues(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

export async function createGameAction(_prev: GameFormState, formData: FormData): Promise<GameFormState> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const values = stringValues(formData);
  const parsed = gameInfoSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs signalés.", fields: fieldErrors(parsed.error), values };
  const allowed = await canCreateGame(user);
  if (!allowed.ok) return { ok: false, error: allowed.error, values };

  const skills = parseTargetSkills(parsed.data.targetSkills);
  const { targetSkills: _t, ...data } = parsed.data;
  void _t;
  const game = await prisma.escapeGame.create({
    data: {
      ...data,
      coverImageUrl: data.coverImageUrl || null,
      targetSkills: JSON.stringify(skills),
      ownerId: user.id,
      slug: await uniqueGameSlug(data.title),
      settings: { create: { maxMinutes: data.estimatedMinutes } },
    },
    select: { id: true },
  });
  await ensureSkillsByName(user.id, skills);
  await track({ name: "game_created", userId: user.id, gameId: game.id });
  revalidatePath("/app");
  revalidatePath("/app/games");
  redirect(`/app/games/${game.id}/steps?created=1`);
}

export async function updateGameAction(gameId: string, _prev: GameFormState, formData: FormData): Promise<GameFormState> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const game = await getOwnedGame(gameId, user.id, { allowAdmin: true, role: user.role });
  if (!game) return { ok: false, error: "Escape Game introuvable." };
  const values = stringValues(formData);
  const parsed = gameInfoSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs signalés.", fields: fieldErrors(parsed.error), values };
  const skills = parseTargetSkills(parsed.data.targetSkills);
  const { targetSkills: _t, ...data } = parsed.data;
  void _t;
  await prisma.escapeGame.update({
    where: { id: game.id },
    data: { ...data, coverImageUrl: data.coverImageUrl || null, targetSkills: JSON.stringify(skills) },
  });
  await ensureSkillsByName(user.id, skills);
  revalidatePath("/app");
  revalidatePath("/app/games");
  revalidatePath(`/app/games/${game.id}`);
  return { ok: true, message: "Modifications enregistrées." };
}

const SETTINGS_BOOLEANS = [
  "pauseAllowed",
  "endOnTimeout",
  "timeBonusEnabled",
  "noHintBonusEnabled",
  "streakBonusEnabled",
  "hintPenaltyEnabled",
  "leaderboardEnabled",
  "showLiveRanking",
  "soundEnabled",
  "musicEnabled",
  "animationsEnabled",
];

export async function updateSettingsAction(gameId: string, _prev: GameFormState, formData: FormData): Promise<GameFormState> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const game = await getOwnedGame(gameId, user.id, { allowAdmin: true, role: user.role });
  if (!game) return { ok: false, error: "Escape Game introuvable." };
  const raw = formToObject(formData, SETTINGS_BOOLEANS);
  if (raw.maxMinutes === "") delete raw.maxMinutes;
  const parsed = gameSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs signalés.", fields: fieldErrors(parsed.error), values: stringValues(formData) };
  const data = { ...parsed.data, maxMinutes: parsed.data.timerMode === "NONE" ? null : (parsed.data.maxMinutes ?? null) };
  await prisma.gameSetting.upsert({ where: { gameId: game.id }, update: data, create: { gameId: game.id, ...data } });
  revalidatePath(`/app/games/${game.id}`);
  revalidatePath(`/app/games/${game.id}/settings`);
  return { ok: true, message: "Réglages enregistrés." };
}
