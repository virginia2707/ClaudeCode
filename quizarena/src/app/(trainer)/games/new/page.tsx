import type { Metadata } from "next";
import { requireTrainer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { parseSettings } from "@/lib/validation/quiz";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { NewGameForm } from "@/components/host/new-game-form";

export const metadata: Metadata = { title: "Nouvelle partie" };

export default async function NewGamePage({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  const user = await requireTrainer();
  const { quiz: preselected } = await searchParams;
  const quizzes = await prisma.quiz.findMany({
    where: { ownerId: user.id, status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nouvelle partie</h1>
        <p className="mt-1 text-text-muted">Choisissez un quiz publié. Un code de participation sera généré immédiatement.</p>
      </div>
      {quizzes.length === 0 ? (
        <EmptyState title="Aucun quiz publié" description="Publiez un quiz pour pouvoir lancer une partie." action={<ButtonLink href="/quizzes">Voir mes quiz</ButtonLink>} />
      ) : (
        <div className="card p-6">
          <NewGameForm
            quizzes={quizzes.map((q) => ({
              id: q.id,
              title: q.title,
              questions: q._count.questions,
              mode: parseSettings(q.settings).mode,
              teams: parseSettings(q.settings).teamNames,
            }))}
            preselected={preselected}
          />
        </div>
      )}
    </div>
  );
}
