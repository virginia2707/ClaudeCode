"use client";

import { useCallback, useState, useTransition } from "react";
import type { LiveState } from "@/lib/sessions/live";
import { getLiveStateAction } from "@/actions/live";
import { endSessionAction, extendSessionAction, pauseSessionAction, resumeSessionAction, reviewAnswerAction, startSessionAction, trainerGrantHintAction, trainerUnlockStepAction } from "@/actions/sessions";
import { useSessionEvents } from "@/components/play/use-session-events";
import { TimerDisplay } from "@/components/play/timer-display";
import { JoinCodeCard } from "@/components/live/join-code-card";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Alert } from "@/components/ui/alert";
import { Stat } from "@/components/ui/stat";
import { StatusPill } from "@/components/app/status-pill";
import { cn } from "@/lib/cn";
import { LEADERBOARD_LABELS } from "@/lib/constants";
import type { LeaderboardMethod } from "@/lib/constants";

export function LiveBoard({ initial }: { initial: LiveState }) {
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const next = await getLiveStateAction(state.session.id);
    if (next) setState(next);
  }, [state.session.id]);

  const { connected } = useSessionEvents(state.session.id, refresh, { pollMs: 4000 });

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? { tone: "success", text: r.message ?? "Fait." } : { tone: "danger", text: r.error ?? "Erreur." });
      await refresh();
    });
  };

  const s = state.session;
  const pendingReviews = state.actors.flatMap((a) => a.pendingAnswers.map((p) => ({ ...p, actor: a.name })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={s.status} />
        <TimerDisplay endsAt={state.timer.endsAt} serverNow={state.timer.serverNow} remainingSeconds={state.timer.remainingSeconds} paused={state.timer.paused} />
        <Pill tone={connected ? "success" : "warning"}>{connected ? "Temps réel actif" : "Reconnexion…"}</Pill>
        <Pill>{LEADERBOARD_LABELS[s.leaderboardMethod as LeaderboardMethod] ?? s.leaderboardMethod}</Pill>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {state.timer.expired && s.status !== "ENDED" ? <Alert tone="warning">Le temps est écoulé.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat label="Participants" value={state.stats.participants} hint={`${state.stats.online} en ligne`} />
            <Stat label="Progression moyenne" value={`${state.stats.averagePercent} %`} />
            <Stat label="Score moyen" value={state.stats.averageScore} />
            <Stat label="Indices utilisés" value={state.stats.hintsUsed} />
          </div>

          {pendingReviews.length > 0 ? (
            <section className="card p-5" aria-labelledby="pending-h">
              <h2 id="pending-h" className="font-semibold">
                Réponses à valider ({pendingReviews.length})
              </h2>
              <ul className="mt-3 space-y-2">
                {pendingReviews.map((p) => (
                  <li key={p.id} className="card-2 p-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {p.actor} · {p.stepTitle}
                      </div>
                      <div className="text-xs text-text-muted font-mono break-all">{p.submitted}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => run(() => reviewAnswerAction(s.id, p.id, true))} disabled={pending}>
                        Valider
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => run(() => reviewAnswerAction(s.id, p.id, false))} disabled={pending}>
                        Refuser
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card overflow-x-auto" aria-labelledby="board-h">
            <h2 id="board-h" className="sr-only">
              Classement et progression
            </h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">{s.mode === "TEAM" ? "Équipe" : "Participant"}</th>
                  <th className="px-3 py-3 font-semibold">Étape</th>
                  <th className="px-3 py-3 font-semibold">Progression</th>
                  <th className="px-3 py-3 font-semibold">Score</th>
                  <th className="px-3 py-3 font-semibold">Indices</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.actors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-text-muted">
                      Aucun participant pour le moment. Partagez le code {s.code}.
                    </td>
                  </tr>
                ) : (
                  state.actors.map((a) => (
                    <tr key={a.progressId} className={cn(a.stuck && "bg-warning-soft")}>
                      <td className="px-3 py-3 tabular-nums">{a.rank}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-block h-2 w-2 rounded-full", a.online ? "bg-success" : "bg-text-subtle")} aria-hidden="true" />
                          <span className="font-medium">{a.name}</span>
                          {a.status === "COMPLETED" ? <Pill tone="success">Terminé</Pill> : null}
                          {a.stuck ? <Pill tone="warning">Bloqué</Pill> : null}
                        </div>
                        {a.members.length > 1 ? <div className="text-xs text-text-muted">{a.members.join(", ")}</div> : null}
                      </td>
                      <td className="px-3 py-3 text-text-muted">{a.currentStepTitle ?? "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="track w-20">
                            <div className="track-fill" style={{ width: `${a.stepsTotal ? (a.stepsCompleted / a.stepsTotal) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">
                            {a.stepsCompleted}/{a.stepsTotal}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{a.score}</td>
                      <td className="px-3 py-3 tabular-nums">{a.hintsUsed}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="ghost" disabled={pending || !a.currentStepId} onClick={() => run(() => trainerGrantHintAction(s.id, a.progressId))}>
                            Indice
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending || !a.currentStepId}
                            onClick={() => run(() => trainerUnlockStepAction(s.id, a.progressId, a.currentStepId as string))}
                          >
                            Débloquer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="card p-5" aria-labelledby="steps-h">
            <h2 id="steps-h" className="font-semibold">
              Difficulté par étape
            </h2>
            <ul className="mt-3 space-y-2">
              {state.stepStats.map((st, i) => (
                <li key={st.id} className="flex items-center gap-3 text-sm">
                  <span className="rail-dot flex-none">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{st.title}</span>
                  <span className="text-xs text-text-muted tabular-nums">
                    {st.completed} réussies · {st.wrong} erreurs · {st.hints} indices
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <JoinCodeCard code={s.code} joinUrl={s.joinUrl} />
          <div className="card p-5 space-y-2">
            <h2 className="font-semibold">Pilotage</h2>
            {s.status === "LOBBY" ? (
              <Button className="w-full" onClick={() => run(() => startSessionAction(s.id))} disabled={pending}>
                Démarrer la mission
              </Button>
            ) : null}
            {s.status === "RUNNING" && s.pauseAllowed ? (
              <Button variant="secondary" className="w-full" onClick={() => run(() => pauseSessionAction(s.id))} disabled={pending}>
                Mettre en pause
              </Button>
            ) : null}
            {s.status === "PAUSED" ? (
              <Button className="w-full" onClick={() => run(() => resumeSessionAction(s.id))} disabled={pending}>
                Reprendre
              </Button>
            ) : null}
            {s.status !== "ENDED" ? (
              <>
                <Button variant="secondary" className="w-full" onClick={() => run(() => extendSessionAction(s.id, 5))} disabled={pending}>
                  +5 minutes
                </Button>
                <Button variant="danger" className="w-full" onClick={() => run(() => endSessionAction(s.id), "Terminer la session pour tous les participants ?")} disabled={pending}>
                  Terminer la session
                </Button>
              </>
            ) : (
              <a href={`/app/sessions/${s.id}/results`} className="btn btn-primary w-full">
                Voir les résultats
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
