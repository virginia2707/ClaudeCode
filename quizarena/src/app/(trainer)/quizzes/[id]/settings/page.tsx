import type { Metadata } from "next";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { parseSettings } from "@/lib/validation/quiz";
import { QuizTabs } from "@/components/quiz/quiz-tabs";
import { QuizSettingsForm } from "@/components/quiz/settings-form";

export const metadata: Metadata = { title: "Réglages du quiz" };

export default async function QuizSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(id, user);
  const settings = parseSettings(quiz.settings);
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">Étape 3 / 5</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{quiz.title} — Réglages</h1>
        <p className="mt-1 text-sm text-text-muted">Ces réglages sont figés au moment où une partie est créée.</p>
      </div>
      <QuizTabs quizId={quiz.id} active="settings" />
      <div className="card max-w-4xl p-6">
        <QuizSettingsForm quizId={quiz.id} settings={settings} />
      </div>
    </div>
  );
}
