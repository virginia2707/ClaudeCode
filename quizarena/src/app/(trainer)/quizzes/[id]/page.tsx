import type { Metadata } from "next";
import { Plus, Sparkles, Play } from "lucide-react";
import { requireTrainer } from "@/lib/auth/session";
import { getOwnedQuiz } from "@/lib/quiz/access";
import { quizPublishIssues } from "@/actions/quiz";
import { QuizTabs } from "@/components/quiz/quiz-tabs";
import { QuizMetaForm } from "@/components/quiz/quiz-meta-form";
import { QuestionList } from "@/components/quiz/question-list";
import { PublishControls } from "@/components/quiz/publish-controls";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Éditer le quiz" };

export default async function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireTrainer();
  const quiz = await getOwnedQuiz(id, user);
  const issues = await quizPublishIssues(quiz.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{quiz.title}</h1>
            <Pill tone={quiz.status === "PUBLISHED" ? "success" : "spark"}>{quiz.status === "PUBLISHED" ? "Publié" : "Brouillon"}</Pill>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""} · étapes : questions → réglages → prévisualisation → publication
          </p>
        </div>
        {quiz.status === "PUBLISHED" ? (
          <ButtonLink href={`/games/new?quiz=${quiz.id}`} variant="spark">
            <Play className="size-4" aria-hidden="true" /> Lancer une partie
          </ButtonLink>
        ) : null}
      </div>

      <QuizTabs quizId={quiz.id} active="questions" />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Questions</h2>
            <div className="flex gap-2">
              <ButtonLink href={`/quizzes/${quiz.id}/generate`} variant="secondary" size="sm">
                <Sparkles className="size-4" aria-hidden="true" /> Générer avec IA
              </ButtonLink>
              <ButtonLink href={`/quizzes/${quiz.id}/questions/new`} size="sm">
                <Plus className="size-4" aria-hidden="true" /> Ajouter une question
              </ButtonLink>
            </div>
          </div>
          {quiz.questions.length === 0 ? (
            <EmptyState
              title="Aucune question"
              description="Ajoutez vos questions à quatre réponses (une seule bonne réponse), ou générez-en avec l'IA puis relisez-les."
              action={<ButtonLink href={`/quizzes/${quiz.id}/questions/new`}>Ajouter une question</ButtonLink>}
            />
          ) : (
            <QuestionList quiz={quiz} />
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold">Publication</h2>
            {issues.length ? (
              <Alert tone="spark" className="mt-3">
                <ul className="list-disc pl-4">
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </Alert>
            ) : (
              <p className="mt-2 text-sm text-text-muted">
                {quiz.status === "PUBLISHED" ? "Ce quiz est publié : vous pouvez lancer des parties." : "Le quiz est prêt à être publié."}
              </p>
            )}
            <div className="mt-4">
              <PublishControls quizId={quiz.id} status={quiz.status} questionCount={quiz.questions.length} />
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Informations</h2>
            <div className="mt-3">
              <QuizMetaForm quizId={quiz.id} initial={{ title: quiz.title, description: quiz.description, category: quiz.category, level: quiz.level }} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
