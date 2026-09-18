import Link from "next/link";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { JoinForm } from "@/components/join-form";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";
import { levelForXP } from "@/lib/constants";
import { ProgressBar } from "@/components/bars";

export default async function ApprenantDashboard({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const progresses = await prisma.progress.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: "desc" },
    include: { simulation: true, userBadges: { include: { badge: true } } },
  });

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Votre carrière commence maintenant.</h1>
          <p className="text-text-muted text-sm mt-1">Rejoignez une simulation avec le code fourni par votre formateur.</p>
        </div>

        <JoinForm defaultCode={code?.toUpperCase() ?? ""} />

        <section className="space-y-4">
          <h2 className="font-semibold">Vos simulations</h2>
          {progresses.length === 0 && (
            <p className="text-text-muted text-sm">Vous n&apos;avez rejoint aucune simulation pour le moment.</p>
          )}
          {progresses.map((p) => {
            const level = levelForXP(p.xp);
            return (
              <Link
                key={p.id}
                href={p.status === "COMPLETED" ? `/play/${p.id}/report` : `/play/${p.id}`}
                className="card p-5 block hover:border-accent transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{p.simulation.title}</h3>
                  <span className="pill">
                    {p.status === "COMPLETED" ? "Terminée" : p.status === "ABANDONED" ? "Abandonnée" : "En cours"}
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-3">
                  Niveau {level.level} — {level.name} · {p.userBadges.length} badge(s)
                </p>
                <ProgressBar value={p.xp} max={level.max === Infinity ? p.xp || 1 : level.max} label="XP" />
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
