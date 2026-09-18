import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Stat } from "@/components/ui/stat";
import { Pill } from "@/components/ui/pill";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-pill";
import { EmptyState } from "@/components/app/empty-state";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getSessionResults } from "@/lib/sessions/results";
import { formatDuration } from "@/lib/format";
import { LEADERBOARD_LABELS, type LeaderboardMethod } from "@/lib/constants";
import { IconCheck, IconTrophy } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Résultats de la session" };

export default async function SessionResultsPage(props: PageProps<"/app/sessions/[id]/results">) {
  const { id } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/sessions/${id}/results`);
  const owned = await prisma.gameSession.findFirst({ where: user.role === "ADMIN" ? { id } : { id, hostId: user.id }, select: { id: true } });
  if (!owned) notFound();
  const results = await getSessionResults(id);
  if (!results) notFound();

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href="/app/sessions" className="hover:text-text">
          Sessions
        </Link>{" "}
        /{" "}
        <Link href={`/app/sessions/${id}`} className="hover:text-text">
          {results.session.code}
        </Link>{" "}
        / <span className="text-text">Résultats</span>
      </nav>
      <PageHeader
        title={`Résultats — ${results.session.gameTitle}`}
        eyebrow={`Session ${results.session.code}`}
        description={`Classement : ${LEADERBOARD_LABELS[results.session.leaderboardMethod as LeaderboardMethod] ?? results.session.leaderboardMethod}.`}
        actions={
          <>
            <ButtonLink href={`/app/sessions/${id}`} variant="secondary">
              Écran de session
            </ButtonLink>
            <ButtonLink href={`/app/games/${results.session.gameId}/stats`} variant="ghost">
              Statistiques du jeu
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={results.session.status} />
        <Pill>{results.session.mode === "TEAM" ? "En équipe" : "Individuel"}</Pill>
      </div>

      {results.rows.length === 0 ? (
        <EmptyState title="Aucun participant" description="Cette session n'a reçu aucun participant." />
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 mb-6">
            <Stat label={results.session.mode === "TEAM" ? "Équipes" : "Participants"} value={results.summary.participants} />
            <Stat label="Taux de réussite" value={`${results.summary.completionRate} %`} tone={results.summary.completionRate >= 70 ? "success" : "warning"} />
            <Stat label="Score moyen" value={results.summary.averageScore} hint={`médiane ${results.summary.medianScore}`} />
            <Stat label="Temps moyen" value={formatDuration(results.summary.averageTimeSeconds)} />
            <Stat label={results.session.mode === "TEAM" ? "Indices / équipe" : "Indices / participant"} value={results.summary.hintRate} />
            <Stat label="Taux d'abandon" value={`${results.summary.abandonRate} %`} tone={results.summary.abandonRate > 30 ? "danger" : "default"} />
          </div>

          <section className="card overflow-x-auto mb-6" aria-labelledby="rank-h">
            <h2 id="rank-h" className="px-4 pt-4 font-semibold">
              Classement
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-text-muted">
                <tr className="border-y border-border">
                  <th className="px-4 py-2.5 font-semibold">#</th>
                  <th className="px-4 py-2.5 font-semibold">{results.session.mode === "TEAM" ? "Équipe" : "Participant"}</th>
                  <th className="px-4 py-2.5 font-semibold">Étapes</th>
                  <th className="px-4 py-2.5 font-semibold">Compétences</th>
                  <th className="px-4 py-2.5 font-semibold">Score</th>
                  <th className="px-4 py-2.5 font-semibold">Temps</th>
                  <th className="px-4 py-2.5 font-semibold">Indices</th>
                  <th className="px-4 py-2.5 font-semibold">Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.rows.map((r) => (
                  <tr key={r.progressId}>
                    <td className="px-4 py-3 tabular-nums">{r.rank}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      {r.members.length > 1 ? <div className="text-xs text-text-muted">{r.members.join(", ")}</div> : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.stepsCompleted}</td>
                    <td className="px-4 py-3 tabular-nums">{r.skillsValidated}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{r.score}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDuration(r.timeSpentSeconds)}</td>
                    <td className="px-4 py-3 tabular-nums">{r.hintsUsed}</td>
                    <td className="px-4 py-3">
                      {r.badges.length === 0 ? (
                        <span className="text-text-subtle">—</span>
                      ) : (
                        <span className="inline-flex flex-wrap gap-1">
                          {r.badges.map((b) => (
                            <Pill key={b} tone="highlight">
                              <IconTrophy size={11} /> {b}
                            </Pill>
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5" aria-labelledby="steps-h">
              <h2 id="steps-h" className="font-semibold">
                Énigmes les plus difficiles
              </h2>
              <ul className="mt-3 space-y-2.5">
                {[...results.steps].sort((a, b) => a.successRate - b.successRate).map((s, i) => (
                  <li key={s.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {i + 1}. {s.title}
                      </span>
                      <span className="tabular-nums text-text-muted">{s.successRate} %</span>
                    </div>
                    <div className="track mt-1">
                      <div className="track-fill" style={{ width: `${s.successRate}%` }} />
                    </div>
                    <div className="mt-0.5 text-xs text-text-subtle">
                      {s.wrong} erreur(s) · {s.hints} indice(s) · {s.averageAttempts} tentative(s) en moyenne
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5" aria-labelledby="skills-h">
              <h2 id="skills-h" className="font-semibold">
                Compétences acquises
              </h2>
              {results.skills.length === 0 ? (
                <p className="mt-2 text-sm text-text-muted">Aucune compétence associée aux énigmes.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {results.skills.map((s) => (
                    <li key={s.name} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 truncate">
                          <span aria-hidden="true" className={s.rate >= 70 ? "text-success" : "text-warning"}>
                            {s.rate >= 70 ? <IconCheck size={14} /> : "⚠"}
                          </span>
                          {s.name}
                        </span>
                        <span className="tabular-nums text-text-muted">
                          {s.validated}/{s.total}
                        </span>
                      </div>
                      <div className="track mt-1">
                        <div className="track-fill" style={{ width: `${s.rate}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
