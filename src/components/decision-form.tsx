"use client";

import { useEffect, useRef, useState } from "react";
import { submitDecisionAction } from "@/actions/play-actions";

type Choice = { id: string; label: string; text: string };

export function DecisionForm({
  progressId,
  situationId,
  choices,
  timeLimitSeconds,
}: {
  progressId: string;
  situationId: string;
  choices: Choice[];
  timeLimitSeconds: number | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(timeLimitSeconds ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timeTakenInputRef = useRef<HTMLInputElement>(null);
  const timedOutInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!timeLimitSeconds) return;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          if (timedOutInputRef.current) timedOutInputRef.current.value = "true";
          setSubmitting(true);
          formRef.current?.requestSubmit();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimitSeconds]);

  function handleSubmit() {
    if (timeTakenInputRef.current) {
      const elapsed = startRef.current ? Date.now() - startRef.current : 0;
      timeTakenInputRef.current.value = String(Math.round(elapsed / 1000));
    }
    setSubmitting(true);
  }

  return (
    <form ref={formRef} action={submitDecisionAction} onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="progressId" value={progressId} />
      <input type="hidden" name="situationId" value={situationId} />
      <input type="hidden" name="choiceId" value={selected ?? ""} />
      <input ref={timeTakenInputRef} type="hidden" name="timeTakenSeconds" defaultValue="0" />
      <input ref={timedOutInputRef} type="hidden" name="timedOut" defaultValue="false" />

      {timeLimitSeconds != null && (
        <div className="flex items-center justify-between text-xs text-text-muted mb-2">
          <span>Temps restant</span>
          <span className={remaining <= 10 ? "text-danger font-semibold" : ""}>{remaining}s</span>
        </div>
      )}

      <div className="space-y-2">
        {choices.map((choice) => (
          <button
            type="button"
            key={choice.id}
            onClick={() => setSelected(choice.id)}
            className={`w-full text-left card-2 p-4 transition-colors ${
              selected === choice.id ? "border-accent" : ""
            }`}
            style={selected === choice.id ? { borderColor: "var(--accent)" } : undefined}
          >
            <span className="font-semibold text-accent mr-2">{choice.label}</span>
            {choice.text}
          </button>
        ))}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={!selected || submitting}>
        {submitting ? "Envoi de votre décision…" : "Valider ma décision"}
      </button>
    </form>
  );
}
