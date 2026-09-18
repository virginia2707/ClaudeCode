import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { QuizTabs } from "@/components/quiz/quiz-tabs";
import { AIGenerateForm } from "@/components/quiz/ai-generate-form";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { PLAN_LIMITS, type Plan } from "@/lib/constants";

export const metadata: Metadata = { title: "Générer avec IA" };

export default async function GeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(id, user);
  const canUseAI = PLAN_LIMITS[user.plan as Plan]?.ai ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-strong">{quiz.title}</div>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Sparkles className="size-6 text-primary-strong" aria-hidden="true" /> Générer des questions avec l&apos;IA
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Décrivez le sujet, le niveau et les compétences visées. L&apos;IA propose des questions que vous relisez et modifiez
          avant de les ajouter au quiz — rien n&apos;est publié automatiquement.
        </p>
      </div>
      <QuizTabs quizId={quiz.id} active="questions" />

      {canUseAI ? (
        <AIGenerateForm quizId={quiz.id} />
      ) : (
        <Alert tone="spark" title={`La génération IA n'est pas incluse dans votre plan ${user.plan}`}>
          <p>Passez au plan Pro pour générer des questions à partir d&apos;un sujet et de compétences.</p>
          <ButtonLink href={`/quizzes/${quiz.id}`} variant="secondary" size="sm" className="mt-3">
            Retour au quiz
          </ButtonLink>
        </Alert>
      )}
    </div>
  );
}
