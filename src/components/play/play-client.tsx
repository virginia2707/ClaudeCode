"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LearnerState } from "@/lib/sessions/engine-runner";
import { enterCodeAction, getPlayStateAction, requestHintAction, submitAnswerAction } from "@/actions/play";
import { PuzzleInput, emptySubmission, hasSubmission, type Submission } from "@/components/play/puzzle-input";
import { useSessionEvents } from "@/components/play/use-session-events";
import { TimerDisplay } from "@/components/play/timer-display";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import { IconCheck, IconLightbulb, IconLock } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Feedback = { tone: "success" | "danger" | "info"; title: string; body?: string; code?: string | null; delta?: number };

export function PlayClient({ initialState, sessionCode }: { initialState: LearnerState; sessionCode: string }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [submission, setSubmission] = useState<Submission>(initialState.currentStep ? emptySubmission(initialState.currentStep.puzzleType) : "");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getPlayStateAction(state.session.id);
    if (next) {
      setState((prev) => {
        // Réinitialise la saisie quand on change d'étape.
        if (next.currentStep?.id !== prev.currentStep?.id) setSubmission(next.currentStep ? emptySubmission(next.currentStep.puzzleType) : "");
        return next;
      });
    }
  }, [state.session.id]);

  const { connected } = useSessionEvents(state.session.id, refresh);

  // Le lobby attend le lancement par le formateur.
  useEffect(() => {
    if (state.session.status === "LOBBY") {
      const t = setInterval(refresh, 4000);
      return () => clearInterval(t);
    }
  }, [state.session.status, refresh]);

  useEffect(() => {
    if (state.completed || state.session.status === "ENDED") {
      router.prefetch(`/play/${sessionCode}/result`);
    }
  }, [state.completed, state.session.status, router, sessionCode]);

  const step = state.currentStep;

  const onSubmit = () => {
    if (!step || busy) return;
    setBusy(true);
    setFeedback(null);
    startTransition(async () => {
      const result = await submitAnswerAction(state.session.id, step.id, submission);
      if (!result.ok) {
        setFeedback({ tone: "danger", title: result.error });
      } else if (result.pending) {
        setFeedback({ tone: "info", title: result.feedback });
      } else if (result.correct) {
        setFeedback({ tone: "success", title: result.feedback, body: result.explanation, code: result.unlockCode, delta: result.scoreDelta });
      } else {
        setFeedback({ tone: "danger", title: result.feedback });
      }
      await refresh();
      setBusy(false);
    });
  };

  const onHint = (hintId: string) => {
    setBusy(true);
    startTransition(async () => {
      const r = await requestHintAction(state.session.id, hintId);
      if (!r.ok) setFeedback({ tone: "danger", title: r.error });
      await refresh();
      setBusy(false);
    });
  };

  const onCode = () => {
    if (!codeDraft.trim()) return;
    setBusy(true);
    startTransition(async () => {
      const r = await enterCodeAction(state.session.id, codeDraft);
      if (!r.ok) setFeedback({ tone: "danger", title: r.error });
      else setFeedback({ tone: r.accepted ? "success" : "danger", title: r.message });
      setCodeDraft("");
      await refresh();
      setBusy(false);
    });
  };

  /* ------------------------------------------------------------------ lobby */
  if (state.session.status === "LOBBY") {
    return (
      <Shell state={state} connected={connected}>
        <div className="card-glow p-6 text-center">
          <Pill tone="accent" className="mb-4">
            Mission prête
          </Pill>
          <h1 className="text-2xl font-semibold">{state.game.title}</h1>
          {state.game.scenario ? <p className="mt-3 text-sm text-text-muted whitespace-pre-line text-left">{state.game.scenario}</p> : null}
          <p className="mt-6 text-sm text-text-muted" aria-live="polite">
            Bonjour {state.progress.actorName}. Le formateur va lancer la mission.
          </p>
          <div className="mt-4 flex justify-center">
            <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          </div>
        </div>
      </Shell>
    );
  }

  /* --------------------------------------------------------------- terminé */
  if (state.completed || state.session.status === "ENDED") {
    return (
      <Shell state={state} connected={connected}>
        <div className="card-glow p-6 text-center">
          <h1 className="text-2xl font-semibold">{state.completed ? "Mission accomplie" : "Mission terminée"}</h1>
          <p className="mt-2 text-sm text-text-muted">
            {state.completed ? state.game.finalMessage || "Vous avez débloqué la mission finale." : "La session est terminée."}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Metric label="Score" value={state.progress.score} />
            <Metric label="Étapes" value={`${state.progress.stepsCompleted}/${state.progress.stepsTotal}`} />
            <Metric label="Indices" value={state.progress.hintsUsed} />
          </div>
          <a href={`/play/${sessionCode}/result`} className="btn btn-primary btn-lg mt-6 w-full">
            Voir mon résultat détaillé
          </a>
        </div>
      </Shell>
    );
  }

  /* ----------------------------------------------------------------- en jeu */
  return (
    <Shell state={state} connected={connected}>
      {state.timer.paused ? (
        <Alert tone="info" className="mb-4">
          Mission en pause par le formateur. Le chronomètre est arrêté.
        </Alert>
      ) : null}

      {step ? (
        <div className="card-glow p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Étape {step.order + 1} / {state.progress.stepsTotal}
            </span>
            <Pill tone="accent">{step.points} pts</Pill>
          </div>
          <h1 className="mt-1 text-xl font-semibold">{step.title}</h1>
          {step.instruction ? <p className="mt-3 text-sm">{step.instruction}</p> : null}
          {step.content ? <div className="mt-3 card-2 p-3 text-sm whitespace-pre-line">{step.content}</div> : null}
          {step.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={step.imageUrl} alt="" className="mt-3 w-full rounded border border-border" />
          ) : null}
          {step.fileUrl ? (
            <a href={step.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm mt-3">
              Télécharger {step.fileName || "le fichier"}
            </a>
          ) : null}
          {step.videoUrl ? (
            <a href={step.videoUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-accent underline underline-offset-4">
              Voir la vidéo
            </a>
          ) : null}

          <div className="mt-5 card-2 p-4">
            {step.prompt ? <p className="text-sm font-medium">{step.prompt}</p> : null}
            <div className="mt-3">
              <PuzzleInput type={step.puzzleType} config={step.config} value={submission} onChange={setSubmission} seed={step.id} disabled={busy || pending} />
            </div>
            {step.attemptsLeft !== null ? (
              <p className="mt-2 text-xs text-text-subtle">{step.attemptsLeft} tentative(s) restante(s).</p>
            ) : null}
            <Button size="lg" className="mt-4 w-full" onClick={onSubmit} disabled={busy || pending || !hasSubmission(step.puzzleType, submission)}>
              {busy || pending ? "Vérification…" : "Valider"}
            </Button>
          </div>

          {step.hints.length > 0 ? (
            <div className="mt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Indices</h2>
              <ul className="mt-2 space-y-2">
                {step.hints.map((h, i) => (
                  <li key={h.id}>
                    {h.text ? (
                      <div className="card-2 p-3 text-sm">
                        <span className="font-semibold text-highlight">Indice {i + 1} :</span> {h.text}
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full justify-between"
                        disabled={busy || pending || step.hints.slice(0, i).some((prev) => prev.text === null)}
                        onClick={() => onHint(h.id)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <IconLightbulb size={15} /> Indice {i + 1}
                        </span>
                        <span className="text-xs">{h.pointCost > 0 ? `−${h.pointCost} pts` : "gratuit"}</span>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="card-glow p-6 text-center">
          <IconLock size={26} className="mx-auto text-warning" />
          <h1 className="mt-3 text-lg font-semibold">Étape verrouillée</h1>
          <p className="mt-1.5 text-sm text-text-muted">{state.currentStepLocked?.reason ?? "Cette étape n'est pas encore accessible."}</p>
          {state.currentStepLocked?.needsCode ? (
            <div className="mt-4 flex gap-2">
              <label htmlFor="unlock-code" className="sr-only">
                Code de déblocage
              </label>
              <Input id="unlock-code" className="input-code" value={codeDraft} maxLength={40} onChange={(e) => setCodeDraft(e.target.value)} placeholder="CODE" />
              <Button onClick={onCode} disabled={busy || pending}>
                Ouvrir
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {feedback ? (
        <div className="mt-4" aria-live="assertive">
          <Alert tone={feedback.tone === "info" ? "info" : feedback.tone}>
            <div className="font-semibold">{feedback.title}</div>
            {feedback.body ? <p className="mt-1 text-sm text-text-muted">{feedback.body}</p> : null}
            {feedback.code ? (
              <p className="mt-2 text-sm">
                Code obtenu : <span className="code-chip">{feedback.code}</span>
              </p>
            ) : null}
            {feedback.delta ? <p className="mt-1 text-sm text-success">+{feedback.delta} points</p> : null}
          </Alert>
        </div>
      ) : null}

      <section className="mt-5" aria-label="Progression de la mission">
        <ol className="space-y-1.5">
          {state.steps.map((s, i) => (
            <li key={s.stepId} className="flex items-center gap-2.5 text-sm">
              <span className={cn("rail-dot", s.state === "DONE" && "rail-dot-done", s.state === "CURRENT" && "rail-dot-current")}>
                {s.state === "DONE" ? <IconCheck size={12} /> : s.state === "LOCKED" ? <IconLock size={11} /> : i + 1}
              </span>
              <span className={s.state === "LOCKED" ? "text-text-subtle" : s.state === "CURRENT" ? "font-medium" : "text-text-muted"}>{s.title}</span>
              {s.isFinal ? <Pill tone="highlight">Finale</Pill> : null}
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card-2 p-3">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Shell({ state, connected, children }: { state: LearnerState; connected: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
        <div className="container-x py-2.5 flex items-center justify-between gap-2">
          <Logo compact href="#" />
          <div className="flex items-center gap-1.5">
            <TimerDisplay
              endsAt={state.timer.endsAt}
              serverNow={state.timer.serverNow}
              remainingSeconds={state.timer.remainingSeconds}
              paused={state.timer.paused}
            />
            <Pill tone="accent">{state.progress.score} pts</Pill>
          </div>
        </div>
        <div className="container-x pb-2">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>
              {state.progress.stepsCompleted}/{state.progress.stepsTotal} étapes · {state.progress.percent} %
            </span>
            <span className="inline-flex items-center gap-1">
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", connected ? "bg-success" : "bg-warning")} aria-hidden="true" />
              {connected ? "En direct" : "Reconnexion…"}
            </span>
          </div>
          <div className="track mt-1">
            <div className="track-fill" style={{ width: `${state.progress.percent}%` }} />
          </div>
        </div>
      </header>
      <main id="contenu" className="flex-1 container-x py-4 max-w-2xl">
        {children}
      </main>
    </div>
  );
}
