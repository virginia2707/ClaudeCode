"use client";

import { useState } from "react";
import { PuzzleInput, emptySubmission, type Submission } from "@/components/play/puzzle-input";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Alert } from "@/components/ui/alert";
import { IconCheck, IconClock, IconLightbulb, IconLock } from "@/components/ui/icons";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";

export type PreviewStep = {
  id: string;
  order: number;
  title: string;
  instruction: string;
  content: string;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  videoUrl: string | null;
  points: number;
  recommendedSeconds: number;
  unlockCode: string | null;
  isFinal: boolean;
  successFeedback: string;
  errorFeedback: string;
  explanation: string;
  puzzleType: string;
  puzzleLabel: string;
  prompt: string;
  config: Record<string, unknown>;
  hints: { text: string; pointCost: number; timeCostSeconds: number }[];
  skills: string[];
  /** Réponses affichées au formateur uniquement, jamais servies à un apprenant. */
  answerSummary: string;
};

export function PreviewClient({ gameTitle, scenario, steps, startIndex }: { gameTitle: string; scenario: string; steps: PreviewStep[]; startIndex: number }) {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(steps.length - 1, 0)));
  const [submission, setSubmission] = useState<Submission>(steps[index] ? emptySubmission(steps[index].puzzleType) : "");
  const [revealedHints, setRevealedHints] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (steps.length === 0) {
    return <Alert tone="warning">Ce jeu n&apos;a aucune étape à prévisualiser.</Alert>;
  }
  const step = steps[index];
  const goto = (i: number) => {
    setIndex(i);
    setSubmission(emptySubmission(steps[i].puzzleType));
    setRevealedHints(0);
    setShowAnswer(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <nav aria-label="Étapes de la prévisualisation" className="card p-4 self-start">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">Mission</h2>
        <ol className="space-y-1.5">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => goto(i)}
                aria-current={i === index ? "step" : undefined}
                className={cn("w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm", i === index ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2")}
              >
                <span className={cn("rail-dot flex-none", i < index && "rail-dot-done", i === index && "rail-dot-current")}>
                  {i < index ? <IconCheck size={12} /> : i > index ? <IconLock size={11} /> : i + 1}
                </span>
                <span className="truncate">{s.title || `Étape ${i + 1}`}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div>
        <div className="card-glow p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{gameTitle}</div>
              <h2 className="mt-0.5 text-xl font-semibold">{step.title || `Étape ${index + 1}`}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill tone="highlight">
                <IconClock size={13} /> {formatDuration(step.recommendedSeconds)}
              </Pill>
              <Pill tone="accent">{step.points} pts</Pill>
            </div>
          </div>

          {index === 0 && scenario ? <p className="mt-4 text-sm text-text-muted whitespace-pre-line">{scenario}</p> : null}
          {step.instruction ? <p className="mt-4 text-sm">{step.instruction}</p> : null}
          {step.content ? <div className="mt-3 card-2 p-3 text-sm whitespace-pre-line">{step.content}</div> : null}
          {step.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={step.imageUrl} alt="" className="mt-3 max-h-64 rounded border border-border" />
          ) : null}
          {step.fileUrl ? (
            <a href={step.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex btn btn-secondary btn-sm">
              Télécharger {step.fileName || "le fichier"}
            </a>
          ) : null}
          {step.videoUrl ? (
            <a href={step.videoUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-accent underline underline-offset-4">
              Voir la vidéo
            </a>
          ) : null}

          <div className="mt-5 card-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Énigme · {step.puzzleLabel}</div>
            {step.prompt ? <p className="mt-2 text-sm">{step.prompt}</p> : <p className="mt-2 text-sm text-warning">Aucun énoncé saisi.</p>}
            <div className="mt-4">
              <PuzzleInput type={step.puzzleType} config={step.config} value={submission} onChange={setSubmission} seed={step.id} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled title="La validation n'est active que pendant une vraie session">
                Valider
              </Button>
              {step.hints.length > revealedHints ? (
                <Button variant="secondary" onClick={() => setRevealedHints((n) => n + 1)}>
                  <IconLightbulb size={16} /> Indice {revealedHints + 1} (−{step.hints[revealedHints].pointCost} pts)
                </Button>
              ) : null}
            </div>
            {revealedHints > 0 ? (
              <ul className="mt-3 space-y-2">
                {step.hints.slice(0, revealedHints).map((h, i) => (
                  <li key={i} className="text-sm text-text-muted">
                    <span className="font-semibold text-highlight">Indice {i + 1} :</span> {h.text || <em>(indice vide)</em>}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => goto(Math.max(0, index - 1))} disabled={index === 0}>
            ← Étape précédente
          </Button>
          <Button variant="ghost" onClick={() => goto(Math.min(steps.length - 1, index + 1))} disabled={index === steps.length - 1}>
            Étape suivante →
          </Button>
        </div>

        <section className="mt-6 card p-5" aria-labelledby="preview-key">
          <h2 id="preview-key" className="font-semibold">
            Vue formateur
          </h2>
          <p className="mt-1 text-sm text-text-muted">Ces informations ne sont jamais envoyées au navigateur des apprenants.</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-muted">Réponse attendue</dt>
              <dd className="mt-0.5">
                {showAnswer ? (
                  <span className="font-mono">{step.answerSummary || "—"}</span>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setShowAnswer(true)}>
                    Afficher
                  </Button>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-muted">Code obtenu</dt>
              <dd className="mt-0.5 font-mono">{step.unlockCode || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-muted">Compétences</dt>
              <dd className="mt-0.5">{step.skills.length ? step.skills.join(", ") : <span className="text-warning">aucune</span>}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-muted">Feedback de réussite</dt>
              <dd className="mt-0.5">{step.successFeedback || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-muted">Feedback d&apos;erreur</dt>
              <dd className="mt-0.5">{step.errorFeedback || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-muted">Explication</dt>
              <dd className="mt-0.5">{step.explanation || "—"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
