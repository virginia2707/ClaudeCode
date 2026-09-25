import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { StatTile } from "@/components/ui/stat-tile";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { levelFor, nextLevel, levelProgress } from "@/lib/game/levels";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  const level = levelFor(user.totalXp);
  const next = nextLevel(user.totalXp);
  const progress = levelProgress(user.totalXp);
  const [recentBadges, distinctBadges, totalBadges] = await Promise.all([
    prisma.playerBadge.findMany({ where: { userId: user.id }, orderBy: { awardedAt: "desc" }, take: 6, include: { badge: true } }),
    // Distinct by badge: the same badge can be earned again in a later game,
    // so counting rows would let this exceed the catalog's total.
    prisma.playerBadge.findMany({ where: { userId: user.id }, select: { badgeId: true }, distinct: ["badgeId"] }),
    prisma.badge.count(),
  ]);
  const badgeCount = distinctBadges.length;

  return (
    <>
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
        <p className="mt-1 text-text-muted">{user.email}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatTile label="XP total" value={formatPoints(user.totalXp)} tone="spark" />
          <StatTile label="Niveau" value={`${level.level} — ${level.name}`} tone="primary" hint="nom ludique, sans valeur de qualification" />
          <StatTile
            label="Prochain niveau"
            value={next ? next.name : "Max"}
            hint={next ? `${formatPoints(next.minXp - user.totalXp)} XP restants` : "niveau maximal atteint"}
          />
        </div>
        <div className="card mt-4 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progression</span>
            <span className="tabular-nums text-text-muted">{Math.round(progress * 100)} %</span>
          </div>
          <div className="timer-track mt-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progression vers le niveau suivant">
            <div className="timer-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <div className="card mt-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Badges</h2>
            <Link href="/badges" className="text-sm text-primary-strong hover:underline">
              Voir tout ({badgeCount} / {totalBadges})
            </Link>
          </div>
          {recentBadges.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">Aucun badge débloqué pour le moment. Jouez une partie pour en gagner.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {recentBadges.map((pb) => (
                <li key={pb.id} className="pill pill-spark" title={pb.badge.description}>
                  <Award className="size-3.5" aria-hidden="true" /> {pb.badge.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
