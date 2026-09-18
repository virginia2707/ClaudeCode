import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { StatusPill } from "@/components/app/status-pill";
import { GameActions } from "@/components/app/game-actions";
import { Pill } from "@/components/ui/pill";
import { Stat } from "@/components/ui/stat";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { guardPage } from "@/lib/auth/guards";
import { getOwnedGame } from "@/lib/games/queries";
import { hasBlockingIssues, validateForPublish } from "@/lib/games/publish";
import { CATEGORY_LABELS, DIFFICULTY_LABELS, LEVEL_LABELS, type Category, type Difficulty, type Level } from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/format";
import { IconArrowRight, IconLayers, IconPlay } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Escape Game" };

export default async function GameOverviewPage(props: PageProps<"/app/games/[id]">) {
  const { id } = await props.params;
  const user = await guardPage(["TRAINER", "ADMIN"], `/app/games/${id}`);
  const game = await getOwnedGame(id, user.id, { allowAdmin: true, role: user.role });
  if (!game) notFound();
  const issues = validateForPublish(game);
  const blocking = hasBlockingIssues(issues);
  const skillNames = Array.from(new Set(game.steps.flatMap((s) => s.puzzle?.skills.map((ps) => ps.skill.name) ?? [])));

  return (
    <>
      <nav aria-label="Fil d'Ariane" className="mb-3 text-sm text-text-muted">
        <Link href="/app/games" className="hover:text-text">
          Mes Escape Games
        </Link>{" "}
        / <span className="text-text">{game.title}</span>
      </nav>
      <PageHeader
        title={game.title}
        description={game.description || "Aucune description."}
        actions={
          <>
            <ButtonLink href={`/app/games/${game.id}/edit`} variant="secondary">
              Modifier
            </ButtonLink>
            <ButtonLink href={`/app/games/${game.id}/steps`} variant="secondary">
              <IconLayers size={16} /> Étapes
            </ButtonLink>
            <ButtonLink href={`/app/games/${game.id}/preview`} variant="ghost">
              Prévisualiser
            </ButtonLink>
            <ButtonLink href={`/app/games/${game.id}/stats`} variant="ghost">
              Statistiques
            </ButtonLink>
            {game.status === "PUBLISHED" ? (
              <ButtonLink href={`/app/games/${game.id}/launch`}>
                <IconPlay size={16} /> Lancer une session
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatusPill status={game.status} />
        {game.isDemo ? <Pill tone="highlight">Démo</Pill> : null}
        <Pill>{CATEGORY_LABELS[game.category as Category] ?? game.category}</Pill>
        <Pill>{LEVEL_LABELS[game.level as Level] ?? game.level}</Pill>
        <Pill>{DIFFICULTY_LABELS[game.difficulty as Difficulty] ?? game.difficulty}</Pill>
        <Pill>{game.mode === "TEAM" ? "En équipe" : "Individuel"}</Pill>
        <Pill>v{game.version}</Pill>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Étapes" value={game.steps.length} />
        <Stat label="Durée estimée" value={`${game.estimatedMinutes} min`} hint={game.settings?.timerMode === "NONE" ? "sans chronomètre" : `max ${game.settings?.maxMinutes ?? "—"} min`} />
        <Stat label="Sessions" value={game._count.sessions} />
        <Stat label="Compétences" value={skillNames.length} hint={skillNames.slice(0, 3).join(", ") || "aucune"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="scenario-h">
            <h2 id="scenario-h" className="font-semibold">
              Scénario
            </h2>
            <p className="mt-2 text-sm text-text-muted whitespace-pre-line">{game.scenario || "Aucun scénario rédigé pour le moment."}</p>
            {game.objective ? (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Objectif pédagogique</h3>
                <p className="mt-1 text-sm">{game.objective}</p>
              </>
            ) : null}
          </section>

          <section className="card p-5" aria-labelledby="steps-h">
            <div className="flex items-center justify-between">
              <h2 id="steps-h" className="font-semibold">
                Étapes ({game.steps.length})
              </h2>
              <Link href={`/app/games/${game.id}/steps`} className="text-sm text-accent hover:underline underline-offset-4">
                Ouvrir le Step Builder
              </Link>
            </div>
            {game.steps.length === 0 ? (
              <p className="mt-2 text-sm text-text-muted">Aucune étape. Ajoutez votre première énigme dans le Step Builder.</p>
            ) : (
              <ol className="mt-3 divide-y divide-border">
                {game.steps.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="rail-dot">{s.order + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/app/games/${game.id}/steps/${s.id}`} className="font-medium hover:text-accent">
                        {s.title || "Étape sans titre"}
                      </Link>
                      <div className="text-xs text-text-muted">
                        {s.puzzle ? s.puzzle.type : "sans énigme"} · {s.points} pts
                        {s.unlockCode ? <> · code <span className="font-mono">{s.unlockCode}</span></> : null}
                      </div>
                    </div>
                    {s.isFinal ? <Pill tone="highlight">Finale</Pill> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="actions-h">
            <h2 id="actions-h" className="font-semibold">
              Actions
            </h2>
            <div className="mt-3">
              <GameActions gameId={game.id} status={game.status} canPublish={!blocking} hasSessions={game._count.sessions > 0} />
            </div>
          </section>

          <section className="card p-5" aria-labelledby="checks-h">
            <h2 id="checks-h" className="font-semibold">
              Vérifications avant publication
            </h2>
            {issues.length === 0 ? (
              <Alert tone="success" className="mt-3">
                Tout est prêt. Vous pouvez publier ce jeu.
              </Alert>
            ) : (
              <ul className="mt-3 space-y-2">
                {issues.map((i, idx) => (
                  <li key={idx}>
                    <Alert tone={i.level === "error" ? "danger" : "warning"}>
                      {i.message}
                      {i.stepId ? (
                        <>
                          {" "}
                          <Link href={`/app/games/${game.id}/steps/${i.stepId}`} className="underline underline-offset-4">
                            Corriger
                          </Link>
                        </>
                      ) : null}
                    </Alert>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5 text-sm text-text-muted">
            <div>Créé le {formatDate(game.createdAt)}</div>
            <div>Modifié le {formatDate(game.updatedAt)}</div>
            {game.publishedAt ? <div>Publié le {formatDate(game.publishedAt)}</div> : null}
            <div className="mt-2">
              {pluralize(game.maxParticipants, "participant")} max ·{" "}
              <Link href={`/app/games/${game.id}/settings`} className="text-accent hover:underline underline-offset-4">
                Réglages du jeu <IconArrowRight size={12} className="inline" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
