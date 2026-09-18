"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pause, Play, SkipForward, Square, Check } from "lucide-react";
import { useGameStream } from "@/hooks/use-game-stream";
import { useCountdown } from "@/hooks/use-countdown";
import type { GameStatePublic } from "@/lib/realtime/events";
import { hostStartAction, hostNextAction, hostPauseAction, hostResumeAction, hostFinishAction, hostAbandonAction } from "@/actions/host";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Pill } from "@/components/ui/pill";
import { ConnectionBadge } from "@/components/play/connection-badge";
import { TimerBar } from "@/components/game/timer-bar";
import { ANSWER_COLORS, ANSWER_LETTERS } from "@/components/game/question-card";
import { Leaderboard, TeamLeaderboard } from "@/components/game/leaderboard";
import { HostLobby } from "./host-lobby";
import { Podium, ResultsTable } from "@/components/game/podium";
import { cn } from "@/lib/utils";

export function HostScreen({ gameId, initialState, joinUrl }: { gameId: string; initialState: GameStatePublic; joinUrl: string }) {
  const { state, connection, now } = useGameStream(gameId, initialState);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = state?.status ?? "LOBBY";
  const question = state?.question ?? null;
  const countdown = useCountdown(question?.endsAt ?? null, question?.startedAt ?? null, now, status !== "QUESTION");

  function run(fn: () => Promise<{ error?: string } | void>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
    });
  }
  if (!state) return null;

  const connectedPlayers = state.players.filter((p) => p.connected).length;
  const answered = state.players.filter((p) => p.answered);
  const distribution = state.reveal?.distribution ?? {};
  const maxCount = Math.max(1, ...Object.values(distribution));
  const isLast = state.currentIndex >= state.totalQuestions - 1;

  return (
    <div className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {status === "LOBBY" ? (
        <HostLobby
          state={state}
          connection={connection}
          joinUrl={joinUrl}
          startButton={
            <Button variant="spark" size="lg" loading={pending} disabled={state.players.length === 0} onClick={() => run(() => hostStartAction(gameId))}>
              <Play className="size-5" aria-hidden="true" /> START QUIZ
            </Button>
          }
        />
      ) : null}

      {question && ["QUESTION", "PAUSED", "REVEAL", "LEADERBOARD"].includes(status) ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <section className="space-y-4" aria-label="Question en cours">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pill tone="primary">Question {question.index + 1} / {question.total}</Pill>
                <Pill>{question.points} pts</Pill>
                {status === "PAUSED" ? <Pill tone="spark">En pause</Pill> : null}
                {status === "REVEAL" ? <Pill tone="success">Résultats</Pill> : null}
                {status === "LEADERBOARD" ? <Pill tone="info">Classement</Pill> : null}
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="info" aria-live="polite">
                  {status === "QUESTION" ? `${answered.length} / ${connectedPlayers} réponses` : `${state.reveal?.answeredCount ?? answered.length} réponses`}
                </Pill>
                <ConnectionBadge status={connection} />
              </div>
            </div>

            {status === "QUESTION" || status === "PAUSED" ? <TimerBar seconds={countdown.seconds} ratio={countdown.ratio} /> : null}

            <div className="card p-6 sm:p-8">
              {question.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={question.imageUrl} alt="" className="mb-4 max-h-72 w-full rounded-xl object-contain" />
              ) : null}
              <p className="text-2xl font-semibold leading-snug sm:text-3xl">{question.text}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {question.answers.map((a, i) => {
                const count = distribution[a.id] ?? 0;
                const isCorrect = state.reveal?.correctAnswerId === a.id;
                const revealed = status === "REVEAL" || status === "LEADERBOARD";
                return (
                  <div key={a.id} className={cn("card-2 relative overflow-hidden px-4 py-3", revealed && isCorrect && "border-success bg-success-soft")}>
                    {revealed && state.settings.showAnswerDistribution ? (
                      <div className="absolute inset-y-0 left-0 bg-primary-soft transition-[width]" style={{ width: `${(count / maxCount) * 100}%` }} aria-hidden="true" />
                    ) : null}
                    <div className="relative flex items-center gap-3">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-black text-black/80", ANSWER_COLORS[i])} aria-hidden="true">
                        {ANSWER_LETTERS[i]}
                      </span>
                      <span className="flex-1 text-base font-medium sm:text-lg">
                        <span className="sr-only">Réponse {ANSWER_LETTERS[i]} : </span>
                        {a.text}
                      </span>
                      {revealed ? (
                        <span className="flex items-center gap-2">
                          {state.settings.showAnswerDistribution ? <span className="text-sm tabular-nums text-text-muted">{count}</span> : null}
                          {isCorrect ? <Check className="size-5 text-success" aria-label="Bonne réponse" /> : null}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {(status === "REVEAL" || status === "LEADERBOARD") && state.reveal?.explanation ? (
              <div className="card p-4 text-sm text-text-muted">
                <span className="font-semibold text-text">Explication : </span>
                {state.reveal.explanation}
              </div>
            ) : null}

            {status === "QUESTION" ? (
              <div className="card p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-faint">Ont répondu</div>
                <ul className="mt-2 flex flex-wrap gap-2" aria-live="polite">
                  {state.players.map((p) => (
                    <li key={p.id} className={cn("pill", p.answered ? "pill-success" : !p.connected ? "opacity-50" : "")}>
                      {p.answered ? <Check className="size-3" aria-hidden="true" /> : null}
                      {p.nickname}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <div className="card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-text-faint">Contrôles</div>
              <div className="mt-3 flex flex-col gap-2">
                {status === "PAUSED" ? (
                  <Button variant="spark" loading={pending} onClick={() => run(() => hostResumeAction(gameId))}>
                    <Play className="size-4" aria-hidden="true" /> Reprendre
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" loading={pending} onClick={() => run(() => hostNextAction(gameId))}>
                      <SkipForward className="size-4" aria-hidden="true" />
                      {status === "QUESTION" ? "Clôturer la question" : status === "REVEAL" && (state.settings.showLeaderboard && !isLast) ? "Afficher le classement" : isLast && status !== "LEADERBOARD" ? "Terminer et afficher le podium" : "Question suivante"}
                    </Button>
                    <Button variant="secondary" loading={pending} onClick={() => run(() => hostPauseAction(gameId))}>
                      <Pause className="size-4" aria-hidden="true" /> Pause
                    </Button>
                  </>
                )}
                <Button
                  variant="danger"
                  loading={pending}
                  onClick={() => {
                    if (confirm("Terminer la partie maintenant ? Les scores actuels seront figés.")) run(() => hostFinishAction(gameId));
                  }}
                >
                  <Square className="size-4" aria-hidden="true" /> Terminer
                </Button>
              </div>
            </div>
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-faint">Classement</div>
                <Pill>{state.players.length} joueurs</Pill>
              </div>
              {state.mode === "TEAM" ? (
                <div className="mb-3">
                  <TeamLeaderboard teams={state.teams} />
                </div>
              ) : null}
              <Leaderboard players={state.players} limit={8} compact showLevel={false} />
            </div>
          </aside>
        </div>
      ) : null}

      {status === "FINISHED" ? (
        <div className="space-y-4">
          {state.results && state.results.length ? (
            <>
              <Podium results={state.results} />
              <div className="grid gap-4 lg:grid-cols-2">
                {state.mode === "TEAM" ? (
                  <div className="card p-4">
                    <h3 className="mb-2 font-semibold">Classement des équipes</h3>
                    <TeamLeaderboard teams={state.teams} />
                  </div>
                ) : null}
                <div className="card p-4">
                  <h3 className="mb-2 font-semibold">Classement complet</h3>
                  <ResultsTable results={state.results} from={0} />
                </div>
              </div>
            </>
          ) : (
            <div className="card p-6 text-center text-text-muted">Calcul des résultats…</div>
          )}
          <div className="flex justify-center gap-2">
            <Link href={`/games/${gameId}/report`} className="btn btn-primary">
              Voir le rapport
            </Link>
          </div>
        </div>
      ) : null}

      {status === "ABANDONED" ? <Alert tone="danger" title="Partie interrompue">Cette partie a été abandonnée.</Alert> : null}

      {status === "LOBBY" ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            loading={pending}
            onClick={() => {
              if (confirm("Annuler cette partie ?")) run(() => hostAbandonAction(gameId));
            }}
          >
            Annuler la partie
          </Button>
        </div>
      ) : null}
    </div>
  );
}
