"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { getOwnedGame, type OwnedGame } from "@/lib/games/queries";
import { uniqueGameSlug } from "@/lib/games/slug";
import { hasBlockingIssues, validateForPublish } from "@/lib/games/publish";
import { canCreateGame } from "@/lib/plans-guard";
import { track } from "@/lib/analytics/track";
import { failResult, okResult, type ActionResult } from "@/lib/action-result";

function settingsCopy(settings: NonNullable<OwnedGame["settings"]>) {
  const copy: Record<string, unknown> = { ...settings };
  delete copy.id;
  delete copy.gameId;
  delete copy.updatedAt;
  return copy as Omit<typeof settings, "id" | "gameId" | "updatedAt">;
}

async function ownedGameOrFail(gameId: string) {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const game = await getOwnedGame(gameId, user.id, { allowAdmin: true, role: user.role });
  if (!game) return { user, game: null, error: failResult("Escape Game introuvable ou accès refusé.") };
  return { user, game, error: null };
}

function revalidateGame(gameId: string) {
  revalidatePath("/app");
  revalidatePath("/app/games");
  revalidatePath(`/app/games/${gameId}`);
}

export async function publishGameAction(gameId: string): Promise<ActionResult> {
  const { user, game, error } = await ownedGameOrFail(gameId);
  if (!game) return error;
  const issues = validateForPublish(game);
  if (hasBlockingIssues(issues)) {
    return failResult("Impossible de publier : " + issues.filter((i) => i.level === "error").map((i) => i.message).join(" "));
  }
  await prisma.escapeGame.update({
    where: { id: game.id },
    data: { status: "PUBLISHED", publishedAt: new Date(), version: { increment: game.status === "PUBLISHED" ? 0 : 1 } },
  });
  await track({ name: "game_published", userId: user.id, gameId: game.id });
  revalidateGame(game.id);
  return okResult(undefined, "Escape Game publié. Vous pouvez lancer une session.");
}

export async function unpublishGameAction(gameId: string): Promise<ActionResult> {
  const { game, error } = await ownedGameOrFail(gameId);
  if (!game) return error;
  const running = await prisma.gameSession.count({ where: { gameId: game.id, status: { in: ["LOBBY", "RUNNING", "PAUSED"] } } });
  if (running > 0) return failResult("Terminez d'abord les sessions en cours avant de dépublier.");
  await prisma.escapeGame.update({ where: { id: game.id }, data: { status: "DRAFT" } });
  revalidateGame(game.id);
  return okResult(undefined, "Escape Game repassé en brouillon.");
}

export async function archiveGameAction(gameId: string): Promise<ActionResult> {
  const { game, error } = await ownedGameOrFail(gameId);
  if (!game) return error;
  const running = await prisma.gameSession.count({ where: { gameId: game.id, status: { in: ["LOBBY", "RUNNING", "PAUSED"] } } });
  if (running > 0) return failResult("Terminez d'abord les sessions en cours avant d'archiver.");
  await prisma.escapeGame.update({ where: { id: game.id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
  revalidateGame(game.id);
  return okResult(undefined, "Escape Game archivé.");
}

export async function restoreGameAction(gameId: string): Promise<ActionResult> {
  const { user, game, error } = await ownedGameOrFail(gameId);
  if (!game) return error;
  const allowed = await canCreateGame(user);
  if (!allowed.ok) return failResult(allowed.error);
  await prisma.escapeGame.update({ where: { id: game.id }, data: { status: "DRAFT", archivedAt: null } });
  revalidateGame(game.id);
  return okResult(undefined, "Escape Game restauré en brouillon.");
}

export async function deleteGameAction(gameId: string): Promise<ActionResult> {
  const { game, error } = await ownedGameOrFail(gameId);
  if (!game) return error;
  if (game._count.sessions > 0) {
    return failResult("Ce jeu a déjà des sessions : archivez-le plutôt pour conserver les résultats.");
  }
  await prisma.escapeGame.delete({ where: { id: game.id } });
  revalidatePath("/app");
  revalidatePath("/app/games");
  redirect("/app/games?deleted=1");
}

/** Duplique un jeu complet (réglages, étapes, énigmes, réponses, indices, compétences) en brouillon. */
export async function duplicateGameAction(gameId: string): Promise<ActionResult<{ id: string }>> {
  const { user, game, error } = await ownedGameOrFail(gameId);
  if (!game) return error;
  const allowed = await canCreateGame(user);
  if (!allowed.ok) return failResult(allowed.error);

  const title = `${game.title} (copie)`.slice(0, 120);
  const slug = await uniqueGameSlug(title);
  const copy = await prisma.$transaction(async (tx) => {
    const created = await tx.escapeGame.create({
      data: {
        ownerId: user.id,
        organizationId: game.organizationId,
        title,
        slug,
        description: game.description,
        category: game.category,
        level: game.level,
        difficulty: game.difficulty,
        estimatedMinutes: game.estimatedMinutes,
        objective: game.objective,
        scenario: game.scenario,
        introduction: game.introduction,
        finalMessage: game.finalMessage,
        coverImageUrl: game.coverImageUrl,
        mode: game.mode,
        maxParticipants: game.maxParticipants,
        status: "DRAFT",
        isDemo: false,
        settings: game.settings ? { create: settingsCopy(game.settings) } : undefined,
      },
      select: { id: true },
    });
    for (const step of game.steps) {
      const newStep = await tx.gameStep.create({
        data: {
          gameId: created.id,
          order: step.order,
          title: step.title,
          description: step.description,
          instruction: step.instruction,
          content: step.content,
          imageUrl: step.imageUrl,
          fileUrl: step.fileUrl,
          fileName: step.fileName,
          videoUrl: step.videoUrl,
          unlockCode: step.unlockCode,
          unlockConditions: step.unlockConditions,
          points: step.points,
          recommendedSeconds: step.recommendedSeconds,
          difficulty: step.difficulty,
          isFinal: step.isFinal,
          successFeedback: step.successFeedback,
          errorFeedback: step.errorFeedback,
          explanation: step.explanation,
        },
        select: { id: true },
      });
      if (step.puzzle) {
        await tx.puzzle.create({
          data: {
            stepId: newStep.id,
            type: step.puzzle.type,
            prompt: step.puzzle.prompt,
            config: step.puzzle.config,
            validationMode: step.puzzle.validationMode,
            maxAttempts: step.puzzle.maxAttempts,
            caseSensitive: step.puzzle.caseSensitive,
            accentSensitive: step.puzzle.accentSensitive,
            answers: { create: step.puzzle.answers.map((a) => ({ value: a.value, isPrimary: a.isPrimary, label: a.label })) },
            hints: { create: step.puzzle.hints.map((h) => ({ order: h.order, text: h.text, pointCost: h.pointCost, timeCostSeconds: h.timeCostSeconds })) },
            skills: { create: step.puzzle.skills.map((s) => ({ skillId: s.skillId, weight: s.weight })) },
          },
        });
      }
    }
    return created;
  });
  await track({ name: "game_created", userId: user.id, gameId: copy.id, payload: { duplicatedFrom: game.id } });
  revalidatePath("/app");
  revalidatePath("/app/games");
  redirect(`/app/games/${copy.id}`);
}
