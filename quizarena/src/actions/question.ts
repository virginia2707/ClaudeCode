"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireTrainer } from "@/lib/auth/session";
import { questionSchema } from "@/lib/validation/quiz";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { writeQuestion } from "@/lib/quiz/write";
import { rateLimit } from "@/lib/rate-limit";

function questionFromForm(formData: FormData) {
  return {
    text: String(formData.get("text") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
    imageAlt: String(formData.get("imageAlt") ?? ""),
    answers: [0, 1, 2, 3].map((i) => String(formData.get(`answer_${i}`) ?? "")),
    correctIndex: String(formData.get("correctIndex") ?? ""),
    explanation: String(formData.get("explanation") ?? ""),
    difficulty: String(formData.get("difficulty") ?? "MEDIUM"),
    timeLimit: String(formData.get("timeLimit") ?? "20"),
    points: String(formData.get("points") ?? "500"),
    category: String(formData.get("category") ?? ""),
    skills: String(formData.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

function valuesFrom(raw: ReturnType<typeof questionFromForm>): Record<string, string> {
  return {
    text: raw.text,
    imageUrl: raw.imageUrl,
    imageAlt: raw.imageAlt,
    answer_0: raw.answers[0],
    answer_1: raw.answers[1],
    answer_2: raw.answers[2],
    answer_3: raw.answers[3],
    correctIndex: raw.correctIndex,
    explanation: raw.explanation,
    difficulty: raw.difficulty,
    timeLimit: raw.timeLimit,
    points: raw.points,
    category: raw.category,
    skills: raw.skills.join(", "),
  };
}

export async function saveQuestionAction(
  quizId: string,
  questionId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireTrainer();
  const rl = rateLimit(`save-question:${user.id}`, 120, 10 * 60 * 1000);
  if (!rl.ok) return { error: "Trop de modifications. Réessayez dans quelques instants." };
  const quiz = await getOwnedQuiz(quizId, user);
  const raw = questionFromForm(formData);
  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) {
    const fe = fieldErrorsFrom(parsed.error.issues);
    // Map answers.N → answer_N for the form
    for (const k of Object.keys(fe)) {
      const m = /^answers\.(\d)$/.exec(k);
      if (m) {
        fe[`answer_${m[1]}`] = fe[k];
        delete fe[k];
      }
    }
    if (raw.correctIndex === "") fe.correctIndex = "Choisissez la bonne réponse.";
    return { fieldErrors: fe, values: valuesFrom(raw) };
  }
  const d = parsed.data;
  if (questionId && !quiz.questions.some((q) => q.id === questionId)) return { error: "Question introuvable." };
  const order = quiz.questions.length ? Math.max(...quiz.questions.map((q) => q.order)) + 1 : 0;
  await writeQuestion({ quizId, ownerId: quiz.ownerId, questionId, order, data: d });
  revalidatePath(`/quizzes/${quizId}`);

  const addAnother = formData.get("intent") === "add-another";
  redirect(addAnother ? `/quizzes/${quizId}/questions/new` : `/quizzes/${quizId}`);
}

export async function deleteQuestionAction(quizId: string, questionId: string): Promise<void> {
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(quizId, user);
  if (!quiz.questions.some((q) => q.id === questionId)) return;
  await prisma.question.delete({ where: { id: questionId } });
  // Re-pack order values
  const rest = quiz.questions.filter((q) => q.id !== questionId);
  await prisma.$transaction(rest.map((q, i) => prisma.question.update({ where: { id: q.id }, data: { order: i } })));
  revalidatePath(`/quizzes/${quizId}`);
}

export async function moveQuestionAction(quizId: string, questionId: string, direction: "up" | "down"): Promise<void> {
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(quizId, user);
  const idx = quiz.questions.findIndex((q) => q.id === questionId);
  if (idx < 0) return;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= quiz.questions.length) return;
  const a = quiz.questions[idx];
  const b = quiz.questions[swap];
  await prisma.$transaction([
    prisma.question.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.question.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(`/quizzes/${quizId}`);
}
