"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export type HintDraft = { text: string; pointCost: number; timeCostSeconds: number };

export function HintsEditor({ hints, onChange, hintPenaltyEnabled }: { hints: HintDraft[]; onChange: (h: HintDraft[]) => void; hintPenaltyEnabled: boolean }) {
  const update = (i: number, patch: Partial<HintDraft>) => onChange(hints.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i: number) => onChange(hints.filter((_, idx) => idx !== i));
  const move = (i: number, delta: number) => {
    const target = i + delta;
    if (target < 0 || target >= hints.length) return;
    const next = [...hints];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Les indices sont proposés dans l&apos;ordre. Leur coût est affiché à l&apos;apprenant <strong>avant</strong> qu&apos;il ne les demande.
        {!hintPenaltyEnabled ? " Les indices sont actuellement gratuits (réglage « Indices payants » désactivé)." : null}
      </p>
      {hints.length === 0 ? <p className="text-sm text-text-subtle">Aucun indice pour cette énigme.</p> : null}
      <ol className="space-y-2">
        {hints.map((h, i) => (
          <li key={i} className="card-2 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Indice {i + 1}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Monter l'indice ${i + 1}`}>
                  ↑
                </Button>
                <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === hints.length - 1} aria-label={`Descendre l'indice ${i + 1}`}>
                  ↓
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(i)} aria-label={`Supprimer l'indice ${i + 1}`}>
                  Supprimer
                </Button>
              </div>
            </div>
            <label className="sr-only" htmlFor={`hint-text-${i}`}>
              Texte de l&apos;indice {i + 1}
            </label>
            <Input id={`hint-text-${i}`} value={h.text} maxLength={500} placeholder="Ex. : Regardez la colonne Total." onChange={(e) => update(i, { text: e.target.value })} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor={`hint-cost-${i}`}>
                  Coût en points
                </label>
                <Input id={`hint-cost-${i}`} type="number" min={0} max={1000} value={h.pointCost} onChange={(e) => update(i, { pointCost: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label" htmlFor={`hint-time-${i}`}>
                  Coût en temps (secondes)
                </label>
                <Input id={`hint-time-${i}`} type="number" min={0} max={3600} value={h.timeCostSeconds} onChange={(e) => update(i, { timeCostSeconds: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Button variant="secondary" size="sm" onClick={() => onChange([...hints, { text: "", pointCost: (hints.length + 1) * 10, timeCostSeconds: 0 }])} disabled={hints.length >= 5}>
        Ajouter un indice
      </Button>
    </div>
  );
}
