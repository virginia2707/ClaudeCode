"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireTrainer } from "@/lib/auth/session";
import { questionSchema } from "@/lib/validation/quiz";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { getOwnedQuiz } from "@/lib/quiz/access";

function questionFromForm(formData: FormData) {
  return {
    text: String(formData.get("text") ?? ""),
    imageUrl: String(formData.get("imageUrl") ?? ""),
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

async function syncSkills(ownerId: string, questionId: string, names: string[]) {
  const unique = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  const skills = await Promise.all(
    unique.map((name) =>
      prisma.skill.upsert({ where: { ownerId_name: { ownerId, name } }, update: {}, create: { ownerId, name } }),
    ),
  );
  await prisma.questionSkill.deleteMany({ where: { questionId } });
  if (skills.length) {
    await prisma.questionSkill.createMany({ data: skills.map((s) => ({ questionId, skillId: s.id })) });
  }
}

export async function saveQuestionAction(
  quizId: string,
  questionId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireTrainer();
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
  const answersData = d.answers.map((text, i) => ({ order: i, text, isCorrect: i === d.correctIndex }));
  const base = {
    text: d.text,
    imageUrl: d.imageUrl || null,
    explanation: d.explanation,
    difficulty: d.difficulty,
    timeLimit: d.timeLimit,
    points: d.points,
    category: d.category,
  };

  let id = questionId;
  if (questionId) {
    const existing = quiz.questions.find((q) => q.id === questionId);
    if (!existing) return { error: "Question introuvable." };
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questionId } }),
      prisma.question.update({ where: { id: questionId }, data: { ...base, answers: { create: answersData } } }),
    ]);
  } else {
    const order = quiz.questions.length ? Math.max(...quiz.questions.map((q) => q.order)) + 1 : 0;
    const created = await prisma.question.create({ data: { ...base, quizId, order, answers: { create: answersData } } });
    id = created.id;
  }
  await syncSkills(quiz.ownerId, id as string, d.skills);
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
