import type { Metadata } from "next";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { parseSettings } from "@/lib/validation/quiz";
import { QuizTabs } from "@/components/quiz/quiz-tabs";
import { QuestionCard, AnswerGrid } from "@/components/game/question-card";
import { PublishControls } from "@/components/quiz/publish-controls";
import { Pill } from "@/components/ui/pill";
import { JOKER_LABELS, JOKER_TYPES } from "@/lib/constants";

export const metadata: Metadata = { title: "Prévisualisation" };

export default async function QuizPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(id, user);
  const s = parseSettings(quiz.settings);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">Étape 4 / 5</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{quiz.title} — Prévisualisation</h1>
        <p className="mt-1 text-sm text-text-muted">Aperçu de ce que verront les apprenants. Les bonnes réponses sont surlignées ici uniquement.</p>
      </div>
      <QuizTabs quizId={quiz.id} active="preview" />

      <div className="flex flex-wrap gap-2">
        <Pill>{s.mode === "TEAM" ? "Mode équipe" : "Mode individuel"}</Pill>
        <Pill>{s.timePerQuestion} s par défaut</Pill>
        <Pill tone="spark">{s.basePoints} pts + rapidité {Math.round(s.speedWeight * 100)} %</Pill>
        <Pill tone={s.streakEnabled ? "success" : "neutral"}>Séries {s.streakEnabled ? "activées" : "désactivées"}</Pill>
        <Pill tone={s.feedbackEnabled ? "success" : "neutral"}>Feedback {s.feedbackEnabled ? "activé" : "désactivé"}</Pill>
        {s.jokersEnabled ? JOKER_TYPES.filter((t) => s.jokers[t] > 0).map((t) => <Pill key={t} tone="primary">{JOKER_LABELS[t].name} × {s.jokers[t]}</Pill>) : <Pill>Jokers désactivés</Pill>}
      </div>

      {quiz.questions.length === 0 ? (
        <p className="text-text-muted">Aucune question à prévisualiser.</p>
      ) : (
        <div className="space-y-8">
          {quiz.questions.map((q, i) => {
            const correct = q.answers.find((a) => a.isCorrect);
            return (
              <section key={q.id} aria-label={`Aperçu question ${i + 1}`} className="max-w-3xl space-y-3">
                <QuestionCard index={i} total={quiz.questions.length} text={q.text} imageUrl={q.imageUrl} />
                <AnswerGrid answers={q.answers.map((a) => ({ id: a.id, text: a.text }))} correctId={correct?.id ?? null} />
                <div className="flex flex-wrap gap-2 text-xs text-text-muted">
                  <Pill>{q.timeLimit} s</Pill>
                  <Pill tone="spark">{q.points} pts</Pill>
                  {q.explanation ? <span className="basis-full text-sm text-text-muted">Explication : {q.explanation}</span> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="card max-w-3xl p-5">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">Étape 5 / 5</div>
        <h2 className="mt-1 font-semibold">Publication</h2>
        <div className="mt-3">
          <PublishControls quizId={quiz.id} status={quiz.status} questionCount={quiz.questions.length} />
        </div>
      </div>
    </div>
  );
}
