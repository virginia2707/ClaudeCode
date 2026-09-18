"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireTrainer } from "@/lib/auth/session";
import { quizMetaSchema, quizSettingsSchema, parseSettings } from "@/lib/validation/quiz";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { PLAN_LIMITS, type Plan } from "@/lib/constants";
import { track } from "@/lib/analytics";
import { getOwnedQuiz } from "@/lib/quiz/access";

function metaFromForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    level: String(formData.get("level") ?? "MEDIUM"),
  };
}

export async function createQuizAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTrainer();
  const raw = metaFromForm(formData);
  const parsed = quizMetaSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values: raw };

  const limit = PLAN_LIMITS[user.plan as Plan]?.maxQuizzes ?? PLAN_LIMITS.FREE.maxQuizzes;
  const count = await prisma.quiz.count({ where: { ownerId: user.id } });
  if (count >= limit) {
    return { error: `Votre plan ${user.plan} est limité à ${limit} quiz. Supprimez un quiz ou changez de plan.`, values: raw };
  }

  const quiz = await prisma.quiz.create({
    data: { ...parsed.data, ownerId: user.id, settings: "{}" },
  });
  await track("quiz_created", { userId: user.id, payload: { quizId: quiz.id } });
  redirect(`/quizzes/${quiz.id}`);
}

export async function updateQuizMetaAction(quizId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTrainer();
  await getOwnedQuiz(quizId, user);
  const raw = metaFromForm(formData);
  const parsed = quizMetaSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values: raw };
  await prisma.quiz.update({ where: { id: quizId }, data: parsed.data });
  revalidatePath(`/quizzes/${quizId}`);
  revalidatePath("/quizzes");
  return { ok: true };
}

function settingsFromForm(formData: FormData) {
  const bool = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";
  const num = (k: string) => String(formData.get(k) ?? "");
  const streakBonuses = String(formData.get("streakBonuses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const teamNames = String(formData.get("teamNames") ?? "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    timePerQuestion: num("timePerQuestion"),
    basePoints: num("basePoints"),
    maxSpeedBonus: num("maxSpeedBonus"),
    speedWeight: num("speedWeight"),
    streakEnabled: bool("streakEnabled"),
    streakBonuses: streakBonuses.length ? streakBonuses : undefined,
    wrongAnswerPenalty: num("wrongAnswerPenalty"),
    feedbackEnabled: bool("feedbackEnabled"),
    showExplanation: bool("showExplanation"),
    showLeaderboard: bool("showLeaderboard"),
    showAnswerDistribution: bool("showAnswerDistribution"),
    shuffleAnswers: bool("shuffleAnswers"),
    soundsEnabled: bool("soundsEnabled"),
    jokersEnabled: bool("jokersEnabled"),
    jokers: {
      FIFTY_FIFTY: num("joker_FIFTY_FIFTY"),
      DOUBLE_POINTS: num("joker_DOUBLE_POINTS"),
      EXTRA_TIME: num("joker_EXTRA_TIME"),
      SECOND_CHANCE: num("joker_SECOND_CHANCE"),
    },
    extraTimeSeconds: num("extraTimeSeconds"),
    mode: String(formData.get("mode") ?? "INDIVIDUAL"),
    teamNames: teamNames.length ? teamNames : undefined,
  };
}

export async function updateQuizSettingsAction(quizId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTrainer();
  await getOwnedQuiz(quizId, user);
  const parsed = quizSettingsSchema.safeParse(settingsFromForm(formData));
  if (!parsed.success) return { error: "Réglages invalides : " + parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join(", ") };
  await prisma.quiz.update({ where: { id: quizId }, data: { settings: JSON.stringify(parsed.data) } });
  revalidatePath(`/quizzes/${quizId}/settings`);
  return { ok: true };
}

/** Validation rules a quiz must satisfy before it can be published or played. */
export async function quizPublishIssues(quizId: string): Promise<string[]> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true }, orderBy: { order: "asc" } } },
  });
  if (!quiz) return ["Quiz introuvable."];
  const issues: string[] = [];
  if (quiz.title.trim().length < 3) issues.push("Le titre est trop court.");
  if (quiz.questions.length === 0) issues.push("Ajoutez au moins une question.");
  quiz.questions.forEach((q, i) => {
    if (q.answers.length !== 4) issues.push(`Question ${i + 1} : quatre réponses sont requises.`);
    if (q.answers.filter((a) => a.isCorrect).length !== 1) issues.push(`Question ${i + 1} : une seule bonne réponse est attendue.`);
  });
  return issues;
}

export async function publishQuizAction(quizId: string): Promise<ActionState> {
  const user = await requireTrainer();
  await getOwnedQuiz(quizId, user);
  const issues = await quizPublishIssues(quizId);
  if (issues.length) return { error: issues.join(" ") };
  await prisma.quiz.update({ where: { id: quizId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  revalidatePath(`/quizzes/${quizId}`);
  revalidatePath("/quizzes");
  return { ok: true };
}

export async function unpublishQuizAction(quizId: string): Promise<ActionState> {
  const user = await requireTrainer();
  await getOwnedQuiz(quizId, user);
  await prisma.quiz.update({ where: { id: quizId }, data: { status: "DRAFT" } });
  revalidatePath(`/quizzes/${quizId}`);
  revalidatePath("/quizzes");
  return { ok: true };
}

export async function deleteQuizAction(quizId: string): Promise<void> {
  const user = await requireTrainer();
  await getOwnedQuiz(quizId, user);
  await prisma.quiz.delete({ where: { id: quizId } });
  revalidatePath("/quizzes");
  redirect("/quizzes");
}

export async function duplicateQuizAction(quizId: string): Promise<void> {
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(quizId, user);
  const copy = await prisma.quiz.create({
    data: {
      ownerId: user.id,
      title: `${quiz.title} (copie)`,
      description: quiz.description,
      category: quiz.category,
      level: quiz.level,
      settings: JSON.stringify(parseSettings(quiz.settings)),
      questions: {
        create: quiz.questions.map((q) => ({
          order: q.order,
          text: q.text,
          imageUrl: q.imageUrl,
          explanation: q.explanation,
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
          points: q.points,
          category: q.category,
          answers: { create: q.answers.map((a) => ({ order: a.order, text: a.text, isCorrect: a.isCorrect })) },
          skills: { create: q.skills.map((s) => ({ skillId: s.skillId })) },
        })),
      },
    },
  });
  redirect(`/quizzes/${copy.id}`);
}
