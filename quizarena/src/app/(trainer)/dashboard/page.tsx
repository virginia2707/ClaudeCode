import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ListChecks, Play, Users, BarChart3 } from "lucide-react";
import { requireTrainer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { StatTile } from "@/components/ui/stat-tile";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const user = await requireTrainer();
  const [quizCount, publishedCount, gameCount, participants] = await Promise.all([
    prisma.quiz.count({ where: { ownerId: user.id } }),
    prisma.quiz.count({ where: { ownerId: user.id, status: "PUBLISHED" } }),
    prisma.game.count({ where: { hostId: user.id } }),
    prisma.gamePlayer.count({ where: { game: { hostId: user.id } } }),
  ]);

  const tiles = [
    { href: "/quizzes", icon: ListChecks, title: "Mes quiz", text: "Créer, éditer et publier vos quiz." },
    { href: "/quizzes/new", icon: Plus, title: "Créer un quiz", text: "Manuellement ou avec l'IA." },
    { href: "/games", icon: Play, title: "Mes parties", text: "Lancer une partie et consulter l'historique." },
    { href: "/stats", icon: BarChart3, title: "Statistiques", text: "Résultats, questions difficiles, participants." },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bonjour {user.name}</h1>
          <p className="mt-1 text-text-muted">Prêt à lancer une nouvelle compétition ?</p>
        </div>
        <ButtonLink href="/quizzes/new">
          <Plus className="size-4" aria-hidden="true" /> Créer un quiz
        </ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Quiz" value={quizCount} hint={`${publishedCount} publié${publishedCount > 1 ? "s" : ""}`} />
        <StatTile label="Parties" value={gameCount} tone="primary" />
        <StatTile label="Participants" value={participants} tone="spark" hint="toutes parties confondues" />
        <StatTile label="Plan" value={user.plan} hint="facturation à venir" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card group p-5 transition hover:border-border-strong">
            <t.icon className="size-6 text-primary-strong" aria-hidden="true" />
            <h2 className="mt-3 font-semibold group-hover:text-primary-strong">{t.title}</h2>
            <p className="mt-1 text-sm text-text-muted">{t.text}</p>
          </Link>
        ))}
        <div className="card p-5 sm:col-span-2">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-spark" aria-hidden="true" />
            <h2 className="font-semibold">Participants</h2>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Les apprenants rejoignent vos parties avec un code, sans créer de compte. Leurs résultats apparaissent dans
            chaque rapport de partie.
          </p>
        </div>
      </div>
    </div>
  );
}
