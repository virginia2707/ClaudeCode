import type { Metadata } from "next";
import Link from "next/link";
import { getHostedGame } from "@/lib/game/host-access";
import { prisma } from "@/lib/db/prisma";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { formatPoints, formatPercent, formatSeconds } from "@/lib/utils";

export const metadata: Metadata = { title: "Rapport de partie" };

// Minimal report (final standings). The full statistics report arrives in Phase 10.
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game, user } = await getHostedGame(id);
  const results = await prisma.gameResult.findMany({ where: { gameId: game.id }, orderBy: { rank: "asc" }, include: { player: { include: { team: true } } } });

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Logo href={user ? "/dashboard" : "/"} />
        {user ? (
          <Link href="/games" className="btn btn-ghost btn-sm">
            Mes parties
          </Link>
        ) : null}
      </header>
      <main id="main" className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{game.quiz.title}</h1>
            <Pill tone={game.status === "FINISHED" ? "success" : "spark"}>{game.status === "FINISHED" ? "Terminée" : game.status}</Pill>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Code {game.code} · {results.length} participant{results.length > 1 ? "s" : ""}
          </p>
        </div>
        {results.length === 0 ? (
          <p className="text-text-muted">Aucun résultat : la partie n&apos;est pas encore terminée.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-text-faint">
                <tr>
                  <th className="px-4 py-3">Rang</th>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Bonnes réponses</th>
                  <th className="px-4 py-3 text-right">Précision</th>
                  <th className="px-4 py-3 text-right">Temps moyen</th>
                  <th className="px-4 py-3 text-right">Meilleure série</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 font-bold tabular-nums">{r.rank}</td>
                    <td className="px-4 py-2">
                      {r.player.nickname}
                      {r.player.team ? <span className="ml-1 text-xs text-text-faint">· {r.player.team.name}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPoints(r.score)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.correctCount} / {r.answeredCount}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPercent(r.accuracy)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatSeconds(r.avgResponseMs)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.bestStreak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-text-muted">Le rapport détaillé (taux de réussite par question, questions à retravailler, répartition des scores) arrive en phase 10.</p>
      </main>
    </div>
  );
}
