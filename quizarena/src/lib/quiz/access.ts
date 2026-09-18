import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

/** Load a quiz the user owns (admins can access any quiz); 404 otherwise. */
export async function getOwnedQuiz(quizId: string, user: { id: string; role: string }) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { answers: { orderBy: { order: "asc" } }, skills: { include: { skill: true } } },
      },
    },
  });
  if (!quiz) notFound();
  if (quiz.ownerId !== user.id && user.role !== "ADMIN") notFound();
  return quiz;
}

export type OwnedQuiz = Awaited<ReturnType<typeof getOwnedQuiz>>;
