"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { uniqueGameSlug } from "@/lib/games/slug";
import { canCreateGame } from "@/lib/plans-guard";
import { ensureSkillsByName } from "@/actions/skills";
import { track } from "@/lib/analytics/track";
import { generateGameDraft } from "@/lib/ai/ai-service";
import { AIError, generationRequestSchema, type GeneratedGame } from "@/lib/ai/types";
import { defaultConfigFor } from "@/lib/puzzles/registry";
import { rateLimit } from "@/lib/auth/rate-limit";
import { PLAN_LIMITS, type PlanLimits } from "@/lib/plans";
import type { Plan } from "@/lib/constants";
import { fieldErrors } from "@/lib/validation/auth";
import type { ActionResult } from "@/lib/action-result";

export type AIFormState = ActionResult & { values?: Record<string, string> };

/**
 * Génère un Escape Game et l'enregistre en BROUILLON.
 * Le formateur doit ensuite le relire, le modifier, le prévisualiser puis le
 * publier lui-même : aucune publication automatique.
 */
export async function generateGameAction(_prev: AIFormState, formData: FormData): Promise<AIFormState> {
  const user = await requireRole(["TRAINER", "ADMIN"]);
  const values: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") values[k] = v;

  const limits: PlanLimits = PLAN_LIMITS[user.plan as Plan] ?? PLAN_LIMITS.FREE;
  if (!limits.ai && user.role !== "ADMIN" && process.env.AI_PROVIDER === "anthropic") {
    return { ok: false, error: `La génération par IA est incluse à partir du plan Pro (plan actuel : ${limits.label}).`, values };
  }

  const parsed = generationRequestSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs signalés.", fields: fieldErrors(parsed.error), values };

  const allowed = await canCreateGame(user);
  if (!allowed.ok) return { ok: false, error: allowed.error, values };

  const limit = rateLimit(`ai:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: "Trop de générations récentes. Réessayez dans quelques minutes.", values };

  let generated: GeneratedGame;
  let jobId: string;
  try {
    const result = await generateGameDraft(user.id, parsed.data);
    generated = result.game;
    jobId = result.job.id;
  } catch (error) {
    return { ok: false, error: error instanceof AIError ? error.message : "Échec de la génération.", values };
  }

  const gameId = await persistDraft(user.id, generated, parsed.data.durationMinutes, jobId);
  await track({ name: "game_created", userId: user.id, gameId, payload: { source: "ai" } });
  revalidatePath("/app");
  revalidatePath("/app/games");
  redirect(`/app/games/${gameId}/steps?generated=1`);
}

async function persistDraft(ownerId: string, game: GeneratedGame, durationMinutes: number, jobId: string) {
  const slug = await uniqueGameSlug(game.title);
  const skillNames = Array.from(new Set([...game.skills, ...game.steps.map((s) => s.skill)].map((s) => s.trim()).filter(Boolean)));
  const skills = await ensureSkillsByName(ownerId, skillNames);
  const skillIdByName = new Map(skills.map((s) => [s.name, s.id]));

  const created = await prisma.$transaction(async (tx) => {
    const created = await tx.escapeGame.create({
      data: {
        ownerId,
        title: game.title.slice(0, 120),
        slug,
        description: game.description,
        scenario: game.scenario,
        introduction: game.introduction,
        finalMessage: game.finalMessage,
        objective: game.objective,
        targetSkills: JSON.stringify(skillNames.slice(0, 20)),
        estimatedMinutes: durationMinutes,
        status: "DRAFT",
        settings: { create: { maxMinutes: durationMinutes } },
      },
      select: { id: true },
    });

    for (const [index, step] of game.steps.entries()) {
      const isFinal = index === game.steps.length - 1;
      const { config, answers } = toPuzzlePayload(step);
      const newStep = await tx.gameStep.create({
        data: {
          gameId: created.id,
          order: index,
          title: step.title.slice(0, 120),
          instruction: step.instruction,
          content: step.content,
          unlockCode: step.unlockCode ? step.unlockCode.slice(0, 40) : null,
          points: step.points,
          recommendedSeconds: step.recommendedSeconds,
          difficulty: step.difficulty,
          isFinal,
          successFeedback: step.successFeedback,
          errorFeedback: step.errorFeedback,
          explanation: step.explanation,
        },
        select: { id: true },
      });
      const skillId = skillIdByName.get(step.skill.trim());
      await tx.puzzle.create({
        data: {
          stepId: newStep.id,
          type: step.puzzleType,
          prompt: step.prompt,
          config: JSON.stringify(config),
          answers: { create: answers.map((value, i) => ({ value: JSON.stringify(value), isPrimary: i === 0 })) },
          hints: { create: step.hints.map((text, i) => ({ order: i, text: text.slice(0, 500), pointCost: (i + 1) * 10, timeCostSeconds: 0 })) },
          skills: skillId ? { create: [{ skillId }] } : undefined,
        },
      });
    }
    return created;
  });

  await prisma.aIJob.update({ where: { id: jobId }, data: { gameId: created.id } });
  return created.id;
}

/** Traduit une étape générée vers la configuration et les réponses du type d'énigme. */
function toPuzzlePayload(step: GeneratedGame["steps"][number]): { config: Record<string, unknown>; answers: unknown[] } {
  const base = defaultConfigFor(step.puzzleType) as Record<string, unknown>;
  switch (step.puzzleType) {
    case "MCQ": {
      const choices = (step.choices.length >= 2 ? step.choices : step.answers).map((label, i) => ({ id: `c${i}`, label: label.slice(0, 300) }));
      const correct = step.correctChoiceIndexes.length > 0 ? step.correctChoiceIndexes : [0];
      const ids = correct.filter((i) => i < choices.length).map((i) => choices[i].id);
      return { config: { ...base, choices, multiple: ids.length > 1, partialCredit: ids.length > 1 }, answers: [ids.length ? ids : [choices[0]?.id ?? "c0"]] };
    }
    case "TRUE_FALSE": {
      const first = (step.answers[0] ?? "").toLowerCase();
      return { config: base, answers: [first.startsWith("v") || first.startsWith("t")] };
    }
    default:
      return { config: base, answers: step.answers.map((a) => a.trim()).filter(Boolean) };
  }
}
