"use client";

import { useCallback, useEffect, useState } from "react";
import { useGameStream } from "@/hooks/use-game-stream";
import { useCountdown } from "@/hooks/use-countdown";
import type { GameStatePublic } from "@/lib/realtime/events";
import type { SubmitResult } from "@/lib/game/engine";
import type { MeView } from "@/app/api/games/[id]/me/route";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { ConnectionBadge } from "./connection-badge";
import { WaitingRoom } from "./waiting-room";
import { GameHeader } from "@/components/game/game-header";
import { TimerBar } from "@/components/game/timer-bar";
import { QuestionCard, AnswerGrid } from "@/components/game/question-card";
import { FeedbackPanel, type FeedbackData } from "@/components/game/feedback-panel";
import { Leaderboard, TeamLeaderboard } from "@/components/game/leaderboard";
import { Podium, ResultCard, ResultsTable } from "@/components/game/podium";
import { JokerBar } from "./joker-bar";
import type { JokerType } from "@/lib/constants";
import { formatPoints } from "@/lib/utils";

async function fetchMe(gameId: string): Promise<MeView | null> {
  try {
    const res = await fetch(`/api/games/${gameId}/me`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as MeView) : null;
  } catch {
    return null;
  }
}

export function PlayerScreen({ gameId, playerId, nickname, initialState }: { gameId: string; playerId: string; nickname: string; initialState: GameStatePublic }) {
  const { state, connection, now } = useGameStream(gameId, initialState);
  const [me, setMe] = useState<MeView | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jokerPending, setJokerPending] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    const m = await fetchMe(gameId);
    if (m) setMe(m);
  }, [gameId]);

  // Reset local answer state when a new question starts (state derived during render).
  const questionId = state?.question?.gameQuestionId ?? null;
  const status = state?.status ?? "LOBBY";
  const [prevQuestionId, setPrevQuestionId] = useState(questionId);
  if (questionId !== prevQuestionId) {
    setPrevQuestionId(questionId);
    setSelected(null);
    setResult(null);
    setError(null);
  }
  // Resync private state (own answer, jokers) whenever the question or phase changes.
  useEffect(() => {
    let cancelled = false;
    fetchMe(gameId).then((m) => {
      if (!cancelled && m) setMe(m);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId, questionId, status]);

  const question = state?.question ?? null;
  const paused = status === "PAUSED";
  const extraMs = me?.effects && me.currentAnswer?.gameQuestionId !== questionId ? me.effects.extraMs : me?.effects?.extraMs ?? 0;
  const personalEndsAt = question ? question.endsAt + (me?.jokers.some((j) => j.type === "EXTRA_TIME" && j.usedOnId === question.gameQuestionId) ? extraMs : 0) : null;
  const countdown = useCountdown(personalEndsAt, question?.startedAt ?? null, now, paused || status !== "QUESTION");

  async function useJokerNow(type: JokerType) {
    if (!question || jokerPending) return;
    setJokerPending(type);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/joker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameQuestionId: question.gameQuestionId, type }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Joker refusé.");
      await refreshMe();
    } catch {
      setError("Connexion perdue. Réessayez.");
    } finally {
      setJokerPending(null);
    }
  }

  async function answer(answerId: string) {
    if (!question || submitting || result) return;
    setSelected(answerId);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameQuestionId: question.gameQuestionId, answerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Réponse refusée.");
        if (res.status !== 409) setSelected(null);
        await refreshMe();
      } else {
        setResult(data as SubmitResult);
        if ((data as SubmitResult).retryAllowed) {
          setResult(null);
          setError("Mauvaise réponse — Second Chance : vous pouvez réessayer.");
        }
      }
    } catch {
      setError("Connexion perdue. Réessayez.");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (!state) return null;
  const meView = state.players.find((p) => p.id === playerId);
  const score = result?.score ?? me?.score ?? meView?.score ?? 0;
  const streak = result?.streakAfter ?? me?.streak ?? meView?.streak ?? 0;
  const currentAnswer = me?.currentAnswer?.gameQuestionId === question?.gameQuestionId ? me?.currentAnswer ?? null : null;
  const retryPending = !!currentAnswer && !currentAnswer.isCorrect && currentAnswer.attempts < 2 && !!me?.effects?.secondChance && !result;
  const alreadyAnswered = !!result || (!!currentAnswer && !retryPending);
  const hidden = new Set(me?.effects?.hiddenAnswerIds ?? []);
  const usedOnCurrent = new Set((me?.jokers ?? []).filter((j) => j.usedOnId === question?.gameQuestionId).map((j) => j.type));
  const answersForGrid = question ? question.answers.map((a) => ({ ...a, hidden: hidden.has(a.id) || (retryPending && a.id === currentAnswer?.answerId) })) : [];
  const mySelected = selected ?? (me?.currentAnswer?.gameQuestionId === question?.gameQuestionId ? me?.currentAnswer?.answerId ?? null : null);

  const feedback: FeedbackData | null = (() => {
    if (status !== "REVEAL" && status !== "LEADERBOARD") return null;
    if (result) return { answered: true, ...result };
    const a = me?.currentAnswer;
    if (a && a.gameQuestionId === questionId) {
      return { answered: true, correct: a.isCorrect, basePoints: a.basePoints, speedBonus: a.speedBonus, streakBonus: a.streakBonus, multiplier: a.multiplier, penalty: a.penalty, total: a.pointsAwarded, streakAfter: me?.streak ?? 0 };
    }
    return { answered: false, correct: false, basePoints: 0, speedBonus: 0, streakBonus: 0, multiplier: 1, penalty: 0, total: 0, streakAfter: 0 };
  })();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Logo href="/" />
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-text-muted sm:inline">{nickname}</span>
          <span className="pill pill-spark tabular-nums">{formatPoints(score)} pts</span>
          <ConnectionBadge status={connection} />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
        {status === "LOBBY" ? <WaitingRoom state={state} playerId={playerId} /> : null}

        {question && (status === "QUESTION" || status === "PAUSED" || status === "REVEAL" || status === "LEADERBOARD") ? (
          <div className="space-y-4">
            <GameHeader index={question.index} total={question.total} score={score} streak={streak} seconds={status === "QUESTION" ? countdown.seconds : undefined} />
            {paused ? <Alert tone="spark" title="Partie en pause">Le formateur reprendra dans un instant.</Alert> : null}

            {status === "QUESTION" || status === "PAUSED" ? (
              <>
                <TimerBar seconds={countdown.seconds} ratio={countdown.ratio} />
                <QuestionCard index={question.index} total={question.total} text={question.text} imageUrl={question.imageUrl} imageAlt={question.imageAlt} />
                <AnswerGrid answers={answersForGrid} onSelect={answer} selectedId={retryPending ? null : mySelected} disabled={paused || submitting || alreadyAnswered || countdown.remainingMs <= 0} />
                {error ? <Alert tone={error.includes("Second Chance") ? "spark" : "danger"}>{error}</Alert> : null}
                {retryPending && !error ? <Alert tone="spark">Second Chance : mauvaise réponse, vous pouvez réessayer une fois.</Alert> : null}
                {state.settings.jokersEnabled && me ? (
                  <JokerBar jokers={me.jokers} usedOnCurrent={usedOnCurrent} disabled={paused || alreadyAnswered || !!currentAnswer || countdown.remainingMs <= 0} pending={jokerPending} onUse={useJokerNow} />
                ) : null}
                {alreadyAnswered && !error ? (
                  <p className="text-center text-sm text-text-muted" role="status">
                    Réponse enregistrée. En attente de la fin du temps…
                  </p>
                ) : null}
              </>
            ) : null}

            {status === "REVEAL" && feedback ? (
              <>
                {state.settings.feedbackEnabled ? <FeedbackPanel data={feedback} explanation={state.reveal?.explanation ?? ""} showExplanation={state.settings.showExplanation} /> : null}
                <QuestionCard index={question.index} total={question.total} text={question.text} imageUrl={question.imageUrl} imageAlt={question.imageAlt} />
                <AnswerGrid answers={question.answers} selectedId={mySelected} correctId={state.reveal?.correctAnswerId ?? null} />
              </>
            ) : null}

            {status === "LEADERBOARD" ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Classement</h2>
                {state.mode === "TEAM" ? <TeamLeaderboard teams={state.teams} highlightId={meView?.teamId} /> : null}
                <Leaderboard players={state.players} highlightId={playerId} />
                <p className="text-center text-sm text-text-muted">Question suivante dans un instant…</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {status === "FINISHED" ? (
          <div className="space-y-4">
            {state.results && state.results.length ? (
              <>
                <Podium results={state.results} highlightId={playerId} />
                {state.mode === "TEAM" ? (
                  <div className="card p-4">
                    <h3 className="mb-2 font-semibold">Classement des équipes</h3>
                    <TeamLeaderboard teams={state.teams} highlightId={meView?.teamId} />
                  </div>
                ) : null}
                {(() => {
                  const mine = state.results.find((r) => r.playerId === playerId);
                  return mine ? <ResultCard r={mine} title="Votre résultat" /> : null;
                })()}
                <ResultsTable results={state.results} highlightId={playerId} />
              </>
            ) : (
              <div className="card p-6 text-center text-text-muted">Calcul des résultats…</div>
            )}
            <p className="text-center text-sm text-text-muted">
              Merci d&apos;avoir joué ! <Link href="/" className="text-primary-strong hover:underline">Retour à l&apos;accueil</Link>
            </p>
          </div>
        ) : null}

        {status === "ABANDONED" ? <Alert tone="danger" title="Partie interrompue">Le formateur a mis fin à la partie.</Alert> : null}
      </main>
    </div>
  );
}
