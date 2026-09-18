import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";
import { levelForXP } from "@/lib/constants";
import { SkillBar } from "@/components/bars";

export default async function ReportPage({ params }: { params: Promise<{ progressId: string }> }) {
  const { progressId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const progress = await prisma.progress.findUnique({
    where: { id: progressId },
    include: {
      simulation: { include: { missions: true } },
      user: true,
      report: true,
      userSkills: { include: { skill: true } },
      userBadges: { include: { badge: true } },
    },
  });
  if (!progress) notFound();
  if (progress.userId !== user.id && user.role !== "ADMIN") redirect("/apprenant");
  if (progress.status !== "COMPLETED" || !progress.report) redirect(`/play/${progressId}`);

  const level = levelForXP(progress.xp);
  const strengths: string[] = JSON.parse(progress.report.strengths || "[]");
  const improvements: string[] = JSON.parse(progress.report.improvements || "[]");
  const keyDecisions: { situation: string; choice: string; impact: string }[] = JSON.parse(
    progress.report.keyDecisions || "[]"
  );

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div className="text-center">
          <p className="pill w-fit mx-auto mb-3">Rapport de performance</p>
          <h1 className="text-2xl font-semibold">{progress.user.name}</h1>
          <p className="text-text-muted text-sm mt-1">{progress.simulation.title}</p>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <Tile label="Score global" value={`${progress.report.globalScore}/100`} />
          <Tile label="XP" value={progress.xp} />
          <Tile label="Niveau" value={`${level.level} — ${level.name}`} />
          <Tile label="Missions réussies" value={`${progress.simulation.missions.length}/${progress.simulation.missions.length}`} />
        </div>

        <section className="card p-6">
          <h2 className="font-semibold mb-4">Compétences</h2>
          <div className="space-y-3">
            {progress.userSkills.map((us) => (
              <SkillBar key={us.id} name={us.skill.name} score={us.score} />
            ))}
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <section className="card p-6">
            <h2 className="font-semibold mb-3">Points forts</h2>
            <ul className="text-sm text-text-muted space-y-1">
              {strengths.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </section>
          <section className="card p-6">
            <h2 className="font-semibold mb-3">Axes de progression</h2>
            <ul className="text-sm text-text-muted space-y-1">
              {improvements.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card p-6">
          <h2 className="font-semibold mb-3">Décisions clés</h2>
          <div className="space-y-3">
            {keyDecisions.map((d, i) => (
              <div key={i} className="card-2 p-4">
                <p className="text-sm font-medium">{d.situation}</p>
                <p className="text-sm text-text-muted">« {d.choice} »</p>
                <p className="text-xs text-text-muted mt-1">{d.impact}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold mb-3">Recommandation pédagogique</h2>
          <p className="text-sm text-text-muted">{progress.report.recommendation}</p>
        </section>

        {progress.userBadges.length > 0 && (
          <section className="card p-6">
            <h2 className="font-semibold mb-3">Badges obtenus</h2>
            <div className="flex flex-wrap gap-2">
              {progress.userBadges.map((ub) => (
                <span key={ub.id} className="pill">
                  {ub.badge.icon} {ub.badge.name}
                </span>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-text-muted text-center">
          Ce rapport est une évaluation pédagogique simulée. Il ne constitue ni un diagnostic
          psychologique, ni une certification professionnelle, ni une mesure scientifique des compétences.
        </p>

        <Link href="/apprenant" className="text-sm text-text-muted block text-center">← Retour à mes simulations</Link>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-accent mt-1">{value}</p>
    </div>
  );
}
