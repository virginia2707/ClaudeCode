import type { Metadata } from "next";
import Link from "next/link";
import { getHostedGame } from "@/lib/game/host-access";
import { joinUrl } from "@/lib/game/create";
import { prisma } from "@/lib/db/prisma";
import { parseSettings } from "@/lib/validation/quiz";
import { Logo } from "@/components/ui/logo";
import { CodePanel } from "@/components/host/code-panel";
import { Pill } from "@/components/ui/pill";
import { MotionToggle } from "@/components/ui/motion-toggle";

export const metadata: Metadata = { title: "Écran formateur" };

export default async function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { game, user } = await getHostedGame(id);
  const settings = parseSettings(game.settings);
  const [players, questionCount] = await Promise.all([
    prisma.gamePlayer.findMany({ where: { gameId: game.id }, orderBy: { joinedAt: "asc" }, include: { team: true } }),
    prisma.gameQuestion.count({ where: { gameId: game.id } }),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <Logo href={user ? "/dashboard" : "/"} />
        <div className="flex items-center gap-2">
          <Pill tone="primary">{settings.mode === "TEAM" ? "Mode équipe" : "Mode individuel"}</Pill>
          <Pill>{questionCount} questions</Pill>
          {game.isDemo ? <Pill tone="spark">Démo</Pill> : null}
          {user ? (
            <Link href="/games" className="btn btn-ghost btn-sm">
              Mes parties
            </Link>
          ) : null}
          <MotionToggle className="btn btn-ghost btn-sm hidden sm:inline-flex" />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{game.quiz.title}</h1>
          {game.quiz.description ? <p className="mt-1 text-text-muted">{game.quiz.description}</p> : null}
        </div>
        <CodePanel code={game.code} joinUrl={joinUrl(game.code)} />
        <section className="card p-5" aria-labelledby="lobby-title">
          <div className="flex items-center justify-between">
            <h2 id="lobby-title" className="font-semibold">
              Participants connectés
            </h2>
            <Pill tone="info">{players.length}</Pill>
          </div>
          {players.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">En attente des participants… La salle d&apos;attente devient temps réel dans la phase suivante.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {players.map((p) => (
                <li key={p.id} className="pill">
                  {p.nickname}
                  {p.team ? <span className="text-text-faint">· {p.team.name}</span> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5">
            <button type="button" className="btn btn-spark btn-lg" disabled>
              START QUIZ
            </button>
            <p className="mt-2 text-xs text-text-muted">Le démarrage arrive avec le lobby temps réel (phase 5).</p>
          </div>
        </section>
      </main>
    </div>
  );
}
