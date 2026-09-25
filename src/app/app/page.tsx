import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { GameCard } from "@/components/app/game-card";
import { StatusPill } from "@/components/app/status-pill";
import { EmptyState } from "@/components/app/empty-state";
import { guardPage } from "@/lib/auth/guards";
import { dashboardStats } from "@/lib/games/queries";
import { formatDateTime, pluralize } from "@/lib/format";
import { IconArrowRight, IconLayers, IconPlay } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TrainerHome() {
  const user = await guardPage(["TRAINER", "ADMIN"], "/app");
  const stats = await dashboardStats(user.id);
  return (
    <>
      <PageHeader
        eyebrow="Espace formateur"
        title={`Bonjour ${user.firstName}`}
        description="Créez une mission, lancez une session et suivez les compétences de vos apprenants."
        actions={
          <>
            <ButtonLink href="/app/games/generate" variant="secondary">
              Générer avec l&apos;IA
            </ButtonLink>
            <ButtonLink href="/app/games/new">
              Créer un Escape Game <IconArrowRight size={16} />
            </ButtonLink>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Escape Games" value={stats.games} hint="brouillons et publiés" />
        <Stat label="Sessions" value={stats.sessionsThisMonth} hint="lancées ce mois-ci" />
        <Stat label="Participants" value={stats.participants} hint="toutes sessions" />
      </div>

      <section className="mt-8" aria-labelledby="recent-games">
        <div className="flex items-center justify-between mb-3">
          <h2 id="recent-games" className="font-semibold text-lg">
            Escape Games récents
          </h2>
          <Link href="/app/games" className="text-sm text-accent hover:underline underline-offset-4">
            Tout voir
          </Link>
        </div>
        {stats.recentGames.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card glow>
              <IconLayers size={22} className="text-accent" />
              <h3 className="mt-3 font-semibold text-lg">Votre premier Escape Game</h3>
              <p className="mt-1.5 text-sm text-text-muted">
                Partez d&apos;un cours existant : un objectif, quelques compétences, un scénario. Le Step Builder vous guide étape par étape.
              </p>
              <ButtonLink href="/app/games/new" className="mt-4" variant="secondary">
                Commencer
              </ButtonLink>
            </Card>
            <Card>
              <IconPlay size={22} className="text-accent" />
              <h3 className="mt-3 font-semibold text-lg">Démo « Mission Excel — Le reporting disparu »</h3>
              <p className="mt-1.5 text-sm text-text-muted">Un escape game complet de 30 minutes, prêt à être lancé et dupliqué (installé en phase 18).</p>
              <ButtonLink href="/demo" className="mt-4" variant="secondary">
                Voir la présentation
              </ButtonLink>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.recentGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="recent-sessions">
        <div className="flex items-center justify-between mb-3">
          <h2 id="recent-sessions" className="font-semibold text-lg">
            Dernières sessions
          </h2>
          <Link href="/app/sessions" className="text-sm text-accent hover:underline underline-offset-4">
            Toutes les sessions
          </Link>
        </div>
        {stats.recentSessions.length === 0 ? (
          <EmptyState title="Aucune session pour le moment" description="Publiez un Escape Game puis cliquez sur « Lancer une session » pour obtenir un code à partager." />
        ) : (
          <ul className="card divide-y divide-border">
            {stats.recentSessions.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                <span className="code-chip text-sm">{s.code}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/app/sessions/${s.id}`} className="font-medium hover:text-accent">
                    {s.game.title}
                  </Link>
                  <div className="text-xs text-text-muted">
                    {formatDateTime(s.createdAt)} · {pluralize(s._count.players, "participant")}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
