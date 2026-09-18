import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { requireTrainer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";

export const metadata: Metadata = { title: "Mes parties" };

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "primary" | "spark" | "success" | "danger" | "info" }> = {
  LOBBY: { label: "Salle d'attente", tone: "info" },
  QUESTION: { label: "En cours", tone: "primary" },
  REVEAL: { label: "En cours", tone: "primary" },
  LEADERBOARD: { label: "En cours", tone: "primary" },
  PAUSED: { label: "En pause", tone: "spark" },
  FINISHED: { label: "Terminée", tone: "success" },
  ABANDONED: { label: "Abandonnée", tone: "danger" },
};

export default async function GamesPage() {
  const user = await requireTrainer();
  const games = await prisma.game.findMany({
    where: { hostId: user.id },
    orderBy: { createdAt: "desc" },
    include: { quiz: { select: { title: true } }, _count: { select: { players: true, questions: true } } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes parties</h1>
          <p className="mt-1 text-text-muted">{games.length} partie{games.length > 1 ? "s" : ""}</p>
        </div>
        <ButtonLink href="/games/new" variant="spark">
          <Play className="size-4" aria-hidden="true" /> Nouvelle partie
        </ButtonLink>
      </div>

      {games.length === 0 ? (
        <EmptyState
          title="Aucune partie"
          description="Publiez un quiz puis lancez une partie : un code à 6 caractères sera généré pour vos apprenants."
          action={<ButtonLink href="/games/new">Lancer une partie</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {games.map((g) => {
            const st = STATUS_LABEL[g.status] ?? { label: g.status, tone: "neutral" as const };
            const href = g.status === "FINISHED" ? `/games/${g.id}/report` : `/games/${g.id}/host`;
            return (
              <li key={g.id}>
                <Link href={href} className="card flex flex-col gap-3 p-4 transition hover:border-border-strong sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="code-display text-lg text-spark">{g.code}</span>
                      <Pill tone={st.tone}>{st.label}</Pill>
                      <Pill>{g.mode === "TEAM" ? "Équipe" : "Individuel"}</Pill>
                    </div>
                    <div className="mt-1 truncate font-medium">{g.quiz.title}</div>
                    <div className="text-xs text-text-muted">
                      {new Date(g.createdAt).toLocaleString("fr-FR")} · {g._count.questions} questions
                    </div>
                  </div>
                  <div className="text-sm text-text-muted">
                    {g._count.players} participant{g._count.players > 1 ? "s" : ""}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
