import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeSessionCode } from "@/lib/engine/session-code";
import { resolveProgress } from "@/actions/play";
import { finalizeProgress } from "@/lib/sessions/engine-runner";
import { readSnapshot } from "@/lib/sessions/snapshot";
import { parseJson } from "@/lib/json";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { Alert } from "@/components/ui/alert";
import { formatDuration } from "@/lib/format";
import { IconCheck, IconTrophy } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Mon résultat" };

type SkillLine = { skillId: string; name: string; validated: boolean; ratio: number };

export default async function ResultPage(props: PageProps<"/play/[code]/result">) {
  const { code } = await props.params;
  const session = await prisma.gameSession.findUnique({ where: { code: normalizeSessionCode(code) }, select: { id: true, code: true, gameSnapshot: true } });
  if (!session) notFound();
  const resolved = await resolveProgress(session.id);
  if (!resolved) redirect(`/join/${session.code}`);

  // Le rapport est figé à la première consultation si la mission est finie.
  await finalizeProgress(resolved.progressId);

  const progress = await prisma.playerProgress.findUnique({
    where: { id: resolved.progressId },
    include: { result: true, badges: { include: { badge: true } }, team: true, player: true },
  });
  if (!progress) notFound();

  const snapshot = readSnapshot(session.gameSnapshot);
  const result = progress.result;
  const skills: SkillLine[] = parseJson<SkillLine[]>(result?.skillsJson, []);
  const recommendations = parseJson<string[]>(result?.recommendations, []);
  const maxScore = snapshot.steps.reduce((acc, s) => acc + s.points, 0);
  const success = progress.status === "COMPLETED";

  return (
    <main id="contenu" className="flex-1 container-x py-6 max-w-2xl">
      <Logo compact href="#" />
      <div className="card-glow p-6 mt-4 text-center">
        <Pill tone={success ? "success" : "warning"}>{success ? "Mission accomplie" : progress.status === "TIMED_OUT" ? "Temps écoulé" : "Mission non terminée"}</Pill>
        <h1 className="mt-3 text-2xl font-semibold">{snapshot.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{progress.team?.name ?? progress.player?.displayName}</p>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Score" value={`${result?.score ?? progress.score}`} hint={maxScore ? `barème ${maxScore} + bonus` : undefined} />
          <Metric label="Temps" value={formatDuration(result?.timeSpentSeconds ?? progress.timeSpentSeconds)} />
          <Metric label="Étapes" value={`${result?.stepsCompleted ?? progress.stepsCompleted}/${result?.stepsTotal ?? snapshot.steps.length}`} />
          <Metric label="Indices" value={`${result?.hintsUsed ?? progress.hintsUsed}`} />
        </div>
      </div>

      <section className="card p-5 mt-4" aria-labelledby="skills-h">
        <h2 id="skills-h" className="font-semibold">
          Compétences
        </h2>
        {skills.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Aucune compétence n&apos;était associée aux énigmes de cette mission.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {skills.map((s) => (
              <li key={s.skillId} className="flex items-center gap-3 text-sm">
                <span aria-hidden="true" className={s.validated ? "text-success" : "text-warning"}>
                  {s.validated ? <IconCheck size={16} /> : "⚠"}
                </span>
                <span className="flex-1">{s.name}</span>
                <span className="text-xs text-text-muted">{s.validated ? "acquise" : `${Math.round(s.ratio * 100)} %`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {progress.badges.length > 0 ? (
        <section className="card p-5 mt-4" aria-labelledby="badges-h">
          <h2 id="badges-h" className="font-semibold">
            Badges obtenus
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {progress.badges.map((b) => (
              <li key={b.id}>
                <Pill tone="highlight">
                  <IconTrophy size={13} /> {b.badge.name}
                </Pill>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card p-5 mt-4" aria-labelledby="reco-h">
        <h2 id="reco-h" className="font-semibold">
          Recommandations
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-text-muted">
          {recommendations.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </section>

      <Alert tone="info" className="mt-4">
        Ce rapport est une évaluation pédagogique de la mission, pas une certification.
      </Alert>
    </main>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-2 p-3">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-text-subtle">{hint}</div> : null}
    </div>
  );
}
