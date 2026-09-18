import type { Metadata } from "next";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { parseSettings } from "@/lib/validation/quiz";
import { QuestionForm } from "@/components/quiz/question-form";

export const metadata: Metadata = { title: "Nouvelle question" };

export default async function NewQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(id, user);
  const s = parseSettings(quiz.settings);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">Étape 2 / 5 · {quiz.title}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Question {quiz.questions.length + 1}</h1>
      </div>
      <div className="card p-6">
        <QuestionForm quizId={quiz.id} questionId={null} defaults={{ timeLimit: s.timePerQuestion, points: s.basePoints }} />
      </div>
    </div>
  );
}
