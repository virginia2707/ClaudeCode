"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { parseJson } from "@/lib/json";
import { fieldErrors } from "@/lib/validation/auth";
import { formToObject } from "@/lib/validation/game";
import { answersSchema, hintsSchema, skillNamesSchema, stepSchema } from "@/lib/validation/step";
import { defaultConfigFor, getPuzzleDefinition } from "@/lib/puzzles/registry";
import { ensureSkillsByName } from "@/lib/skills";
import { failResult, okResult, type ActionResult } from "@/lib/action-result";

export type StepFormState = ActionResult & { values?: Record<string, string> };

const STEP_BOOLEANS = ["isFinal", "caseSensitive", "accentSensitive"];

async function ownedGame(gameId: string) {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const game = await prisma.escapeGame.findFirst({
    where: user.role === "ADMIN" ? { id: gameId } : { id: gameId, ownerId: user.id },
    select: { id: true, ownerId: true, status: true },
  });
  return { user, game };
}

async function ownedStep(stepId: string) {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const step = await prisma.gameStep.findFirst({
    where: user.role === "ADMIN" ? { id: stepId } : { id: stepId, game: { ownerId: user.id } },
    include: { game: { select: { id: true, ownerId: true } }, puzzle: { include: { answers: true, hints: true, skills: true } } },
  });
  return { user, step };
}

function revalidateSteps(gameId: string) {
  revalidatePath(`/app/games/${gameId}`);
  revalidatePath(`/app/games/${gameId}/steps`);
  revalidatePath("/app/games");
}

/** Ajoute une étape vide à la fin du parcours. */
export async function addStepAction(gameId: string): Promise<ActionResult<{ stepId: string }>> {
  const { game } = await ownedGame(gameId);
  if (!game) return failResult("Escape Game introuvable.");
  const count = await prisma.gameStep.count({ where: { gameId: game.id } });
  if (count >= 30) return failResult("30 étapes maximum par Escape Game.");
  const step = await prisma.gameStep.create({
    data: {
      gameId: game.id,
      order: count,
      title: `Étape ${count + 1}`,
      instruction: "",
      points: 100,
      recommendedSeconds: 300,
      puzzle: { create: { type: "SHORT_ANSWER", prompt: "", config: JSON.stringify(defaultConfigFor("SHORT_ANSWER")) } },
    },
    select: { id: true },
  });
  revalidateSteps(game.id);
  return okResult({ stepId: step.id }, "Étape ajoutée.");
}

export async function deleteStepAction(stepId: string): Promise<ActionResult> {
  const { step } = await ownedStep(stepId);
  if (!step) return failResult("Étape introuvable.");
  await prisma.$transaction(async (tx) => {
    await tx.gameStep.delete({ where: { id: step.id } });
    const rest = await tx.gameStep.findMany({ where: { gameId: step.game.id }, orderBy: { order: "asc" }, select: { id: true } });
    // Réindexation en deux temps : la contrainte unique (gameId, order) interdit les collisions.
    for (let i = 0; i < rest.length; i++) await tx.gameStep.update({ where: { id: rest[i].id }, data: { order: -1000 - i } });
    for (let i = 0; i < rest.length; i++) await tx.gameStep.update({ where: { id: rest[i].id }, data: { order: i } });
  });
  revalidateSteps(step.game.id);
  return okResult(undefined, "Étape supprimée.");
}

export async function duplicateStepAction(stepId: string): Promise<ActionResult<{ stepId: string }>> {
  const { step } = await ownedStep(stepId);
  if (!step) return failResult("Étape introuvable.");
  const count = await prisma.gameStep.count({ where: { gameId: step.game.id } });
  if (count >= 30) return failResult("30 étapes maximum par Escape Game.");
  const created = await prisma.$transaction(async (tx) => {
    const after = await tx.gameStep.findMany({ where: { gameId: step.game.id, order: { gt: step.order } }, orderBy: { order: "desc" }, select: { id: true, order: true } });
    for (const s of after) await tx.gameStep.update({ where: { id: s.id }, data: { order: s.order + 1 } });
    const copy = await tx.gameStep.create({
      data: {
        gameId: step.game.id,
        order: step.order + 1,
        title: `${step.title} (copie)`.slice(0, 120),
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
        isFinal: false,
        successFeedback: step.successFeedback,
        errorFeedback: step.errorFeedback,
        explanation: step.explanation,
      },
      select: { id: true },
    });
    if (step.puzzle) {
      await tx.puzzle.create({
        data: {
          stepId: copy.id,
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
    return copy;
  });
  revalidateSteps(step.game.id);
  return okResult({ stepId: created.id }, "Étape dupliquée.");
}

/** Réordonne toutes les étapes d'un jeu selon la liste d'identifiants fournie. */
export async function reorderStepsAction(gameId: string, orderedIds: string[]): Promise<ActionResult> {
  const { game } = await ownedGame(gameId);
  if (!game) return failResult("Escape Game introuvable.");
  const existing = await prisma.gameStep.findMany({ where: { gameId: game.id }, select: { id: true } });
  const existingIds = new Set(existing.map((s) => s.id));
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    return failResult("Liste d'étapes invalide.");
  }
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) await tx.gameStep.update({ where: { id: orderedIds[i] }, data: { order: -1000 - i } });
    for (let i = 0; i < orderedIds.length; i++) await tx.gameStep.update({ where: { id: orderedIds[i] }, data: { order: i } });
  });
  revalidateSteps(game.id);
  return okResult(undefined, "Ordre enregistré.");
}

/** Enregistre une étape complète (contenu + énigme + réponses + indices + compétences). */
export async function saveStepAction(stepId: string, _prev: StepFormState, formData: FormData): Promise<StepFormState> {
  const { user, step } = await ownedStep(stepId);
  if (!step) return failResult("Étape introuvable.");

  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v;

  const raw = formToObject(formData, STEP_BOOLEANS);
  if (raw.maxAttempts === "") delete raw.maxAttempts;
  const parsed = stepSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs signalés.", fields: fieldErrors(parsed.error), values };
  const data = parsed.data;

  // Config de l'énigme : validée par le schéma du type, sinon config par défaut.
  const def = getPuzzleDefinition(data.puzzleType);
  const configParsed = def.configSchema.safeParse(parseJson<unknown>(data.config, {}));
  const config = configParsed.success ? configParsed.data : def.defaultConfig();

  const answersParsed = answersSchema.safeParse(parseJson<unknown[]>(data.answers, []));
  if (!answersParsed.success) return { ok: false, error: "Réponses acceptées invalides.", values };
  // Chaque réponse doit correspondre au schéma du type d'énigme.
  const answers = answersParsed.data.filter((a) => def.answerSchema.safeParse(a).success);

  const hintsParsed = hintsSchema.safeParse(parseJson<unknown[]>(data.hints, []));
  if (!hintsParsed.success) return { ok: false, error: hintsParsed.error.issues[0]?.message ?? "Indices invalides.", values };

  const skillsParsed = skillNamesSchema.safeParse(parseJson<unknown[]>(data.skills, []));
  if (!skillsParsed.success) return { ok: false, error: skillsParsed.error.issues[0]?.message ?? "Compétences invalides.", values };
  const skills = await ensureSkillsByName(step.game.ownerId ?? user.id, skillsParsed.data);

  await prisma.$transaction(async (tx) => {
    if (data.isFinal) await tx.gameStep.updateMany({ where: { gameId: step.game.id, id: { not: step.id } }, data: { isFinal: false } });
    await tx.gameStep.update({
      where: { id: step.id },
      data: {
        title: data.title,
        description: data.description,
        instruction: data.instruction,
        content: data.content,
        imageUrl: data.imageUrl || null,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        videoUrl: data.videoUrl || null,
        unlockCode: data.unlockCode || null,
        points: data.points,
        recommendedSeconds: data.recommendedSeconds,
        difficulty: data.difficulty,
        isFinal: data.isFinal,
        successFeedback: data.successFeedback,
        errorFeedback: data.errorFeedback,
        explanation: data.explanation,
      },
    });
    const puzzleData = {
      type: data.puzzleType,
      prompt: data.prompt,
      config: JSON.stringify(config),
      validationMode: data.validationMode,
      maxAttempts: data.maxAttempts && data.maxAttempts > 0 ? data.maxAttempts : null,
      caseSensitive: data.caseSensitive,
      accentSensitive: data.accentSensitive,
    };
    const puzzle = await tx.puzzle.upsert({ where: { stepId: step.id }, update: puzzleData, create: { stepId: step.id, ...puzzleData }, select: { id: true } });
    await tx.answer.deleteMany({ where: { puzzleId: puzzle.id } });
    if (answers.length > 0) {
      await tx.answer.createMany({ data: answers.map((a, i) => ({ puzzleId: puzzle.id, value: JSON.stringify(a), isPrimary: i === 0 })) });
    }
    await tx.hint.deleteMany({ where: { puzzleId: puzzle.id } });
    if (hintsParsed.data.length > 0) {
      await tx.hint.createMany({ data: hintsParsed.data.map((h, i) => ({ puzzleId: puzzle.id, order: i, text: h.text, pointCost: h.pointCost, timeCostSeconds: h.timeCostSeconds })) });
    }
    await tx.puzzleSkill.deleteMany({ where: { puzzleId: puzzle.id } });
    if (skills.length > 0) {
      await tx.puzzleSkill.createMany({ data: skills.map((s) => ({ puzzleId: puzzle.id, skillId: s.id })) });
    }
  });

  revalidateSteps(step.game.id);
  revalidatePath(`/app/games/${step.game.id}/steps/${step.id}`);
  return okResult(undefined, "Étape enregistrée.");
}

/** Ajoute une étape puis ouvre son éditeur. */
export async function addStepAndEditAction(gameId: string) {
  const result = await addStepAction(gameId);
  if (!result.ok || !result.data) return;
  redirect(`/app/games/${gameId}/steps/${result.data.stepId}`);
}
