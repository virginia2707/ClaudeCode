import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleValue } from "@/lib/constants";
import { ProgressBar } from "@/components/bars";

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default async function SimulationStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: simulationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "FORMATEUR" && user.role !== "ADMIN") redirect("/dashboard");

  const simulation = await prisma.simulation.findUnique({
    where: { id: simulationId },
    include: { skills: true },
  });
  if (!simulation) notFound();
  if (user.role !== "ADMIN" && simulation.createdById !== user.id) redirect("/formateur");

  const progresses = await prisma.progress.findMany({
    where: { simulationId },
    include: { userSkills: { include: { skill: true } }, user: true },
  });

  const decisions = await prisma.decision.findMany({
    where: { progress: { simulationId } },
    include: { situation: { include: { mission: true } }, choice: true },
  });

  const participants = progresses.length;
  const completed = progresses.filter((p) => p.status === "COMPLETED").length;
  const abandoned = progresses.filter((p) => p.status === "ABANDONED").length;
  const completionRate = participants > 0 ? Math.round((completed / participants) * 100) : 0;
  const abandonRate = participants > 0 ? Math.round((abandoned / participants) * 100) : 0;
  const avgScore = average(progresses.map((p) => p.score));
  const medianScore = median(progresses.map((p) => p.score));
  const avgXP = average(progresses.map((p) => p.xp));

  const skillAverages = simulation.skills
    .map((skill) => {
      const scores = progresses.flatMap((p) => p.userSkills.filter((us) => us.skillId === skill.id).map((us) => us.score));
      return { name: skill.name, avg: average(scores), n: scores.length };
    })
    .filter((s) => s.n > 0)
    .sort((a, b) => b.avg - a.avg);

  const bySituation = new Map<string, { title: string; times: number[]; choiceCounts: Map<string, number> }>();
  for (const d of decisions) {
    const key = d.situationId;
    if (!bySituation.has(key)) {
      bySituation.set(key, { title: `${d.situation.title} (jour ${d.situation.mission.dayNumber})`, times: [], choiceCounts: new Map() });
    }
    const entry = bySituation.get(key)!;
    if (d.timeTakenSeconds != null) entry.times.push(d.timeTakenSeconds);
    entry.choiceCounts.set(d.choice.label, (entry.choiceCounts.get(d.choice.label) ?? 0) + 1);
  }

  const situationStats = [...bySituation.entries()].map(([id, v]) => ({
    id,
    title: v.title,
    avgTime: average(v.times),
    totalDecisions: [...v.choiceCounts.values()].reduce((a, b) => a + b, 0),
    mostFrequent: [...v.choiceCounts.entries()].sort((a, b) => b[1] - a[1])[0],
  }));

  return (
    <div className="flex-1">
      <NavBar user={{ name: user.name, role: user.role as RoleValue }} />
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <div>
          <Link href={`/formateur/simulations/${simulationId}`} className="text-sm text-text-muted">← {simulation.title}</Link>
          <h1 className="text-2xl font-semibold mt-2">Statistiques</h1>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <StatTile label="Participants" value={participants} />
          <StatTile label="Taux de complétion" value={`${completionRate}%`} />
          <StatTile label="Score moyen" value={avgScore} />
          <StatTile label="Score médian" value={medianScore} />
          <StatTile label="XP moyen" value={avgXP} />
          <StatTile label="Taux d'abandon" value={`${abandonRate}%`} />
        </div>

        <section className="card p-6">
          <h2 className="font-semibold mb-4">Compétences — moyenne des apprenants</h2>
          {skillAverages.length === 0 && <p className="text-text-muted text-sm">Pas encore de données.</p>}
          <div className="space-y-3">
            {skillAverages.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.name}</span>
                  <span className="text-text-muted">{s.avg}/100</span>
                </div>
                <ProgressBar value={s.avg} max={100} />
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold mb-4">Situations : temps moyen &amp; décision la plus fréquente</h2>
          {situationStats.length === 0 && <p className="text-text-muted text-sm">Pas encore de données.</p>}
          <div className="space-y-2">
            {situationStats.map((s) => (
              <div key={s.id} className="card-2 p-4 flex items-center justify-between text-sm">
                <span>{s.title}</span>
                <span className="text-text-muted">
                  {s.avgTime > 0 ? `${s.avgTime}s moy.` : "—"} · choix {s.mostFrequent?.[0] ?? "—"} le plus fréquent ({s.mostFrequent?.[1] ?? 0}/{s.totalDecisions})
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold mb-4">Apprenants</h2>
          <div className="space-y-2">
            {progresses.map((p) => (
              <div key={p.id} className="card-2 p-4 flex items-center justify-between text-sm">
                <span>{p.user.name}</span>
                <span className="text-text-muted">
                  {p.status === "COMPLETED" ? "Terminé" : p.status === "ABANDONED" ? "Abandonné" : "En cours"} · score {p.score} · {p.xp} XP
                </span>
              </div>
            ))}
            {progresses.length === 0 && <p className="text-text-muted text-sm">Aucun apprenant inscrit pour le moment.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-accent mt-1">{value}</p>
    </div>
  );
}
