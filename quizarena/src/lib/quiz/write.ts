import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { QuestionInput } from "@/lib/validation/quiz";

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

/**
 * Create or replace a question's content (used by both the manual editor and
 * the "add to quiz" step of AI generation, so both paths share one write path
 * and the same validation guarantees).
 */
export async function writeQuestion(opts: {
  quizId: string;
  ownerId: string;
  questionId: string | null;
  order: number;
  data: QuestionInput;
}): Promise<string> {
  const { quizId, ownerId, questionId, order, data: d } = opts;
  const answersData = d.answers.map((text, i) => ({ order: i, text, isCorrect: i === d.correctIndex }));
  const base = {
    text: d.text,
    imageUrl: d.imageUrl || null,
    imageAlt: d.imageUrl ? d.imageAlt : null,
    explanation: d.explanation,
    difficulty: d.difficulty,
    timeLimit: d.timeLimit,
    points: d.points,
    category: d.category,
  };

  let id = questionId;
  if (questionId) {
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questionId } }),
      prisma.question.update({ where: { id: questionId }, data: { ...base, answers: { create: answersData } } }),
    ]);
  } else {
    const created = await prisma.question.create({ data: { ...base, quizId, order, answers: { create: answersData } } });
    id = created.id;
  }
  await syncSkills(ownerId, id as string, d.skills);
  return id as string;
}
