import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/app/empty-state";
import { StatusPill } from "@/components/app/status-pill";
import { guardPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getGameStats } from "@/lib/sessions/results";
import { formatDate, formatDuration } from "@/lib/format";
import { IconChart } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Statistiques" };

export default async function GameStatsPage(props: PageProps<"/app/games/[id]/stats">) {
  const { id } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}/stats`);
  const game = await prisma.escapeGame.findFirst({ where: user.role === "ADMIN" ? { id } : { id, ownerId: user.id }, select: { id: true, title: true } });
  if (!game) notFound();
  const stats = await getGameStats(game.id);

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href={`/app/games/${game.id}`} className="hover:text-text">
          {game.title}
        </Link>{" "}
        / <span className="text-text">Statistiques</span>
      </nav>
      <PageHeader title="Statistiques" description="Agrégées sur toutes les sessions de cet Escape Game." />

      {stats.totals.sessions === 0 ? (
        <EmptyState icon={<IconChart size={22} />} title="Aucune session" description="Lancez une session pour collecter des statistiques." />
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
            <Stat label="Sessions" value={stats.totals.sessions} />
            <Stat label="Participants" value={stats.totals.participants} />
            <Stat label="Taux de réussite" value={`${stats.totals.completionRate} %`} tone={stats.totals.completionRate >= 70 ? "success" : "warning"} />
            <Stat label="Score moyen" value={stats.totals.averageScore} />
            <Stat label="Temps moyen" value={formatDuration(stats.totals.averageTimeSeconds)} />
            <Stat label="Taux d'abandon" value={`${stats.totals.abandonRate} %`} tone={stats.totals.abandonRate > 30 ? "danger" : "default"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5" aria-labelledby="hard-h">
              <h2 id="hard-h" className="font-semibold">
                Énigmes les plus difficiles
              </h2>
              <ul className="mt-3 space-y-2.5">
                {stats.steps.map((s) => (
                  <li key={s.title} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.title}</span>
                      <span className="tabular-nums text-text-muted">{s.successRate} %</span>
                    </div>
                    <div className="track mt-1">
                      <div className="track-fill" style={{ width: `${s.successRate}%` }} />
                    </div>
                    <div className="mt-0.5 text-xs text-text-subtle">
                      {s.wrong} erreur(s) · {s.hints} indice(s)
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5" aria-labelledby="skills-h">
              <h2 id="skills-h" className="font-semibold">
                Compétences problématiques
              </h2>
              {stats.skills.length === 0 ? (
                <p className="mt-2 text-sm text-text-muted">Aucune compétence associée.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {stats.skills.map((s) => (
                    <li key={s.name} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{s.name}</span>
                        <span className="tabular-nums text-text-muted">{s.rate} %</span>
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

          <section className="card overflow-x-auto mt-6" aria-labelledby="sessions-h">
            <h2 id="sessions-h" className="px-4 pt-4 font-semibold">
              Comparaison des sessions
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-text-muted">
                <tr className="border-y border-border">
                  <th className="px-4 py-2.5 font-semibold">Code</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Participants</th>
                  <th className="px-4 py-2.5 font-semibold">Réussite</th>
                  <th className="px-4 py-2.5 font-semibold">Score moyen</th>
                  <th className="px-4 py-2.5 font-semibold">Temps moyen</th>
                  <th className="px-4 py-2.5 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <Link href={`/app/sessions/${s.id}/results`} className="code-chip text-xs">
                        {s.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums">{s.participants}</td>
                    <td className="px-4 py-3 tabular-nums">{s.completionRate} %</td>
                    <td className="px-4 py-3 tabular-nums">{s.averageScore}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDuration(s.averageTimeSeconds)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
