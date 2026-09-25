import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trophy, Crown, Medal, Star, CheckCircle2, Flame, Zap, Timer, TrendingUp, Users, Award, type LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Badges" };

const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  crown: Crown,
  medal: Medal,
  star: Star,
  "check-circle": CheckCircle2,
  flame: Flame,
  zap: Zap,
  timer: Timer,
  "trending-up": TrendingUp,
  users: Users,
};

export default async function BadgesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/badges");

  const [badges, earned] = await Promise.all([
    prisma.badge.findMany({ orderBy: { name: "asc" } }),
    prisma.playerBadge.findMany({
      where: { userId: user.id },
      orderBy: { awardedAt: "desc" },
      include: { badge: true, player: { include: { game: { include: { quiz: { select: { title: true } } } } } } },
    }),
  ]);
  const earnedByBadgeId = new Map(earned.map((e) => [e.badgeId, e]));

  return (
    <>
      <AppHeader />
      <main id="main" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Badges</h1>
          <p className="mt-1 text-text-muted">
            {earnedByBadgeId.size} / {badges.length} badge{badges.length > 1 ? "s" : ""} débloqué{earnedByBadgeId.size > 1 ? "s" : ""}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {badges.map((b) => {
            const award = earnedByBadgeId.get(b.id);
            const Icon = ICONS[b.icon] ?? Award;
            return (
              <li key={b.id} className={cn("card flex items-start gap-4 p-5", !award && "opacity-60")}>
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-xl",
                    award ? "bg-[linear-gradient(135deg,var(--primary),var(--spark))] text-white" : "bg-surface-2 text-text-faint",
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{b.name}</h2>
                    {!award ? <span className="pill">Verrouillé</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-text-muted">{b.description}</p>
                  {award ? (
                    <p className="mt-2 text-xs text-text-faint">
                      Débloqué le {new Date(award.awardedAt).toLocaleDateString("fr-FR")}
                      {award.player.game?.quiz.title ? ` · ${award.player.game.quiz.title}` : ""}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-sm text-text-muted">
          Les badges sont des éléments de gamification et ne constituent pas une qualification professionnelle.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
