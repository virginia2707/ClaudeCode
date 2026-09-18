"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { addStepAction, deleteStepAction, duplicateStepAction, reorderStepsAction } from "@/actions/steps";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/app/empty-state";
import { IconLayers, IconLightbulb, IconLock } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type StepRow = {
  id: string;
  title: string;
  puzzleType: string | null;
  puzzleLabel: string;
  points: number;
  recommendedSeconds: number;
  unlockCode: string | null;
  isFinal: boolean;
  hintCount: number;
  answerCount: number;
  skills: string[];
  ready: boolean;
};

export function StepList({ gameId, steps: initialSteps }: { gameId: string; steps: StepRow[] }) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Resynchronisation avec les données serveur (pattern React « ajuster l'état
  // pendant le rendu » plutôt qu'un effet).
  const [lastServerSteps, setLastServerSteps] = useState(initialSteps);
  if (initialSteps !== lastServerSteps) {
    setLastServerSteps(initialSteps);
    setSteps(initialSteps);
    setDirty(false);
  }

  const persistOrder = (ordered: StepRow[]) => {
    setSteps(ordered);
    setDirty(true);
    startTransition(async () => {
      const r = await reorderStepsAction(gameId, ordered.map((s) => s.id));
      if (r.ok) {
        setMessage({ tone: "success", text: "Ordre enregistré." });
        setDirty(false);
        router.refresh();
      } else {
        setMessage({ tone: "danger", text: r.error });
      }
    });
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = steps.findIndex((s) => s.id === dragId);
    const to = steps.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    persistOrder(next);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? { tone: "success", text: r.message ?? "Fait." } : { tone: "danger", text: r.error ?? "Erreur." });
      router.refresh();
    });
  };

  if (steps.length === 0) {
    return (
      <>
        {message ? <Alert tone={message.tone} className="mb-4">{message.text}</Alert> : null}
        <EmptyState
          icon={<IconLayers size={22} />}
          title="Aucune étape"
          description="Une étape = une énigme = une compétence. Ajoutez la première étape de votre mission."
          action={
            <Button onClick={() => run(() => addStepAction(gameId))} disabled={pending}>
              Ajouter une étape
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-text-muted">
          Glissez-déposez pour réorganiser, ou utilisez les boutons Monter / Descendre.{" "}
          {dirty ? <span className="text-warning">Enregistrement…</span> : null}
        </p>
        <Button onClick={() => run(() => addStepAction(gameId))} disabled={pending}>
          Ajouter une étape
        </Button>
      </div>
      {message ? <Alert tone={message.tone} className="mb-4">{message.text}</Alert> : null}
      <ol className="space-y-2" aria-label="Étapes de la mission">
        {steps.map((s, i) => (
          <li
            key={s.id}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(s.id)}
            onDragEnd={() => setDragId(null)}
            className={cn("card p-4 flex flex-col sm:flex-row sm:items-center gap-3", dragId === s.id && "opacity-60 border-accent")}
          >
            <span className="rail-dot flex-none" aria-hidden="true">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/app/games/${gameId}/steps/${s.id}`} className="font-medium hover:text-accent">
                  {s.title || "Étape sans titre"}
                </Link>
                {s.isFinal ? <Pill tone="highlight">Mission finale</Pill> : null}
                {!s.ready ? <Pill tone="danger">À compléter</Pill> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span>{s.puzzleLabel}</span>
                <span>{s.points} pts</span>
                <span>{Math.round(s.recommendedSeconds / 60)} min</span>
                {s.hintCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <IconLightbulb size={12} /> {s.hintCount}
                  </span>
                ) : null}
                {s.unlockCode ? (
                  <span className="inline-flex items-center gap-1">
                    <IconLock size={12} /> <span className="font-mono">{s.unlockCode}</span>
                  </span>
                ) : null}
                {s.skills.length > 0 ? <span>{s.skills.join(", ")}</span> : <span className="text-warning">sans compétence</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={pending || i === 0} aria-label={`Monter l'étape ${i + 1}`}>
                ↑
              </Button>
              <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={pending || i === steps.length - 1} aria-label={`Descendre l'étape ${i + 1}`}>
                ↓
              </Button>
              <Link href={`/app/games/${gameId}/steps/${s.id}`} className="btn btn-secondary btn-sm">
                Modifier
              </Link>
              <Button variant="ghost" size="sm" onClick={() => run(() => duplicateStepAction(s.id))} disabled={pending}>
                Dupliquer
              </Button>
              <Button variant="ghost" size="sm" onClick={() => run(() => deleteStepAction(s.id), `Supprimer l'étape « ${s.title} » ?`)} disabled={pending}>
                Supprimer
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
