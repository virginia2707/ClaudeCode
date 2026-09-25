import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { parseSettings } from "@/lib/validation/quiz";
import { QuestionForm } from "@/components/quiz/question-form";

export const metadata: Metadata = { title: "Modifier la question" };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string; questionId: string }> }) {
  const { id, questionId } = await params;
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(id, user);
  const index = quiz.questions.findIndex((q) => q.id === questionId);
  if (index < 0) notFound();
  const q = quiz.questions[index];
  const s = parseSettings(quiz.settings);
  const initial = {
    text: q.text,
    imageUrl: q.imageUrl ?? "",
    imageAlt: q.imageAlt ?? "",
    answer_0: q.answers[0]?.text ?? "",
    answer_1: q.answers[1]?.text ?? "",
    answer_2: q.answers[2]?.text ?? "",
    answer_3: q.answers[3]?.text ?? "",
    correctIndex: String(q.answers.findIndex((a) => a.isCorrect)),
    explanation: q.explanation,
    difficulty: q.difficulty,
    timeLimit: String(q.timeLimit),
    points: String(q.points),
    category: q.category,
    skills: q.skills.map((sk) => sk.skill.name).join(", "),
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">{quiz.title}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Modifier la question {index + 1}</h1>
      </div>
      <div className="card p-6">
        <QuestionForm quizId={quiz.id} questionId={q.id} initial={initial} defaults={{ timeLimit: s.timePerQuestion, points: s.basePoints }} />
      </div>
    </div>
  );
}
