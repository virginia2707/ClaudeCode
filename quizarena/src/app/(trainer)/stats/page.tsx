import type { Metadata } from "next";
import Link from "next/link";
import { requireTrainer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { Pill } from "@/components/ui/pill";
import { average, formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Statistiques" };

export default async function StatsPage() {
  const user = await requireTrainer();
  const results = await prisma.quizResult.findMany({
    where: { game: { hostId: user.id } },
    orderBy: { createdAt: "desc" },
    include: { game: { select: { id: true, code: true, mode: true, endedAt: true } }, quiz: { select: { title: true } } },
  });

  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
        <EmptyState
          title="Les statistiques arrivent après les premières parties"
          description="Chaque partie terminée produit un rapport détaillé : taux de réussite par question, temps moyen, répartition des scores et classement final."
        />
      </div>
    );
  }

  const totalParticipants = results.reduce((s, r) => s + r.participants, 0);
  const overallAvg = average(results.map((r) => r.avgScore));
  const questionsFlagged = results.reduce((s, r) => {
    try {
      return s + (JSON.parse(r.stats).questionsToReview?.length ?? 0);
    } catch {
      return s;
    }
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Statistiques</h1>
        <p className="mt-1 text-text-muted">{results.length} partie{results.length > 1 ? "s" : ""} terminée{results.length > 1 ? "s" : ""}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Parties terminées" value={results.length} />
        <StatTile label="Participants cumulés" value={totalParticipants} tone="primary" />
        <StatTile label="Score moyen global" value={formatPoints(overallAvg)} tone="spark" />
      </div>

      {questionsFlagged > 0 ? (
        <p className="text-sm text-text-muted">
          <Pill tone="spark">{questionsFlagged}</Pill> question{questionsFlagged > 1 ? "s" : ""} au total sous le seuil de révision
          dans vos parties — un signal à regarder, pas un verdict.
        </p>
      ) : null}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-text-faint">
            <tr>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3 text-right">Participants</th>
              <th className="px-4 py-3 text-right">Score moyen</th>
              <th className="px-4 py-3 text-right">Score médian</th>
              <th className="px-4 py-3">Terminée le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="max-w-xs truncate px-4 py-3 font-medium">{r.quiz.title}</td>
                <td className="px-4 py-3">
                  <span className="code-display text-xs">{r.game.code}</span>
                </td>
                <td className="px-4 py-3">
                  <Pill>{r.game.mode === "TEAM" ? "Équipe" : "Individuel"}</Pill>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.participants}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPoints(r.avgScore)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPoints(r.medianScore)}</td>
                <td className="px-4 py-3 text-text-muted">{r.game.endedAt ? new Date(r.game.endedAt).toLocaleString("fr-FR") : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/games/${r.game.id}/report`} className="btn btn-secondary btn-sm">
                    Voir le rapport
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
