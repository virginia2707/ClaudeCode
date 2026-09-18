import type { Metadata } from "next";
import Link from "next/link";
import { getHostedGame } from "@/lib/game/host-access";
import { prisma } from "@/lib/db/prisma";
import { computeGameReport } from "@/lib/game/report";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { StatTile } from "@/components/ui/stat-tile";
import { Alert } from "@/components/ui/alert";
import { QuestionStatsTable } from "@/components/report/question-stats-table";
import { ScoreDistribution } from "@/components/report/score-distribution";
import { formatPoints, formatPercent, formatSeconds } from "@/lib/utils";

export const metadata: Metadata = { title: "Rapport de partie" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game, user } = await getHostedGame(id);
  const [results, report] = await Promise.all([
    prisma.gameResult.findMany({ where: { gameId: game.id }, orderBy: { rank: "asc" }, include: { player: { include: { team: true } } } }),
    computeGameReport(game.id),
  ]);

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
      <main id="main" className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{game.quiz.title}</h1>
            <Pill tone={game.status === "FINISHED" ? "success" : "spark"}>{game.status === "FINISHED" ? "Terminée" : "En cours"}</Pill>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Code {game.code} · {report?.participants ?? 0} participant{(report?.participants ?? 0) > 1 ? "s" : ""}
          </p>
        </div>

        {game.status !== "FINISHED" ? (
          <Alert tone="spark" title="Partie non terminée">
            Ces statistiques se figeront une fois la partie terminée. Elles reflètent l&apos;état actuel.
          </Alert>
        ) : null}

        {!report || report.participants === 0 ? (
          <p className="text-text-muted">Aucun participant : pas de statistiques à afficher.</p>
        ) : (
          <>
            <section aria-labelledby="overview-title" className="space-y-3">
              <h2 id="overview-title" className="text-lg font-semibold">
                Vue d&apos;ensemble
              </h2>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatTile label="Participants" value={report.participants} />
                <StatTile label="Score moyen" value={formatPoints(report.avgScore)} tone="spark" />
                <StatTile label="Score médian" value={formatPoints(report.medianScore)} tone="spark" />
                <StatTile label="Précision moyenne" value={formatPercent(report.avgAccuracy)} />
                <StatTile label="Temps moyen" value={formatSeconds(report.avgResponseMs)} />
                <StatTile label="Meilleure série" value={report.bestStreak >= 2 ? `🔥 x${report.bestStreak}` : report.bestStreak} tone="primary" />
              </div>
            </section>

            <section aria-labelledby="distribution-title">
              <h2 id="distribution-title" className="sr-only">
                Répartition des scores
              </h2>
              <ScoreDistribution buckets={report.scoreDistribution} />
            </section>

            <section aria-labelledby="questions-title" className="space-y-3">
              <h2 id="questions-title" className="text-lg font-semibold">
                Taux de réussite par question
              </h2>
              <QuestionStatsTable
                questions={report.questions}
                reviewThreshold={report.reviewThreshold}
                hardestId={report.hardestQuestion?.gameQuestionId}
                easiestId={report.easiestQuestion?.gameQuestionId}
              />
            </section>

            {report.questionsToReview.length > 0 ? (
              <section aria-labelledby="review-title" className="space-y-3">
                <h2 id="review-title" className="text-lg font-semibold">
                  Questions pouvant mériter d&apos;être retravaillées
                </h2>
                <Alert tone="spark">
                  Un taux de réussite sous {formatPercent(report.reviewThreshold)} peut signaler qu&apos;une notion mérite d&apos;être
                  retravaillée. Ce n&apos;est pas nécessairement la preuve que la question ou le cours est en soi mauvais : la
                  difficulté, le nombre de répondants ou le hasard peuvent aussi l&apos;expliquer.
                </Alert>
                <ul className="space-y-2">
                  {report.questionsToReview.map((q) => (
                    <li key={q.gameQuestionId} className="card-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          Question {q.order + 1} — {formatPercent(q.successRate ?? 0)} de réussite
                        </span>
                        <span className="text-xs text-text-muted">{formatSeconds(q.avgResponseMs)} en moyenne</span>
                      </div>
                      <p className="mt-1 text-sm text-text-muted">{q.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="ranking-title" className="space-y-3">
              <h2 id="ranking-title" className="text-lg font-semibold">
                Classement final
              </h2>
              {results.length === 0 ? (
                <p className="text-text-muted">Le classement final apparaîtra une fois la partie terminée.</p>
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
            </section>
          </>
        )}
      </main>
    </div>
  );
}
