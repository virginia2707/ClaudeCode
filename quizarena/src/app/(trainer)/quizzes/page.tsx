import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTrainer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { DIFFICULTY_LABELS, type Difficulty } from "@/lib/constants";

export const metadata: Metadata = { title: "Mes quiz" };

export default async function QuizzesPage() {
  const user = await requireTrainer();
  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true, games: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes quiz</h1>
          <p className="mt-1 text-text-muted">{quizzes.length} quiz</p>
        </div>
        <ButtonLink href="/quizzes/new">
          <Plus className="size-4" aria-hidden="true" /> Créer un quiz
        </ButtonLink>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          title="Aucun quiz pour le moment"
          description="Créez votre premier quiz : titre, questions, réglages, puis publiez-le pour lancer une partie."
          action={<ButtonLink href="/quizzes/new">Créer un quiz</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {quizzes.map((q) => (
            <li key={q.id}>
              <Link href={`/quizzes/${q.id}`} className="card block h-full p-5 transition hover:border-border-strong">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-snug">{q.title}</h2>
                  <Pill tone={q.status === "PUBLISHED" ? "success" : q.status === "ARCHIVED" ? "neutral" : "spark"}>
                    {q.status === "PUBLISHED" ? "Publié" : q.status === "ARCHIVED" ? "Archivé" : "Brouillon"}
                  </Pill>
                </div>
                {q.description ? <p className="mt-2 line-clamp-2 text-sm text-text-muted">{q.description}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
                  <Pill>{q._count.questions} question{q._count.questions > 1 ? "s" : ""}</Pill>
                  <Pill>{q._count.games} partie{q._count.games > 1 ? "s" : ""}</Pill>
                  {q.category ? <Pill tone="info">{q.category}</Pill> : null}
                  <Pill>{DIFFICULTY_LABELS[q.level as Difficulty] ?? q.level}</Pill>
                  {q.isDemo ? <Pill tone="primary">Démo</Pill> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
