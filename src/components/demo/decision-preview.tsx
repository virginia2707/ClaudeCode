"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkConstraints, formatConstraintAlert } from "@/lib/mission-engine/types";
import type { LaunchPreview } from "@/lib/demo/launch-48h-preview";
import { cn } from "@/lib/utils/cn";

const eur = (n: number) => `${n.toLocaleString("fr-FR")} €`;

export function DecisionPreview({ decision }: { decision: LaunchPreview["decision"] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const chosen = decision.options.find((o) => o.label === submitted) ?? null;
  const checks = chosen
    ? checkConstraints({ budget: chosen.budget }, [{ key: "budget", label: "Budget maximum", operator: "MAX", value: decision.budgetLimit, unit: "€" }])
    : [];

  return (
    <div className="space-y-5">
      <fieldset disabled={!!submitted} className="space-y-3">
        <legend className="mb-3 font-medium text-text">{decision.prompt}</legend>
        {decision.options.map((o) => {
          const active = selected === o.label;
          return (
            <label
              key={o.label}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                active ? "border-accent bg-accent-soft" : "border-border bg-bg-elevated hover:border-border-strong",
                submitted && !active && "opacity-60",
              )}
            >
              <input
                type="radio"
                name="strategy"
                value={o.label}
                checked={active}
                onChange={() => setSelected(o.label)}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">Option {o.label}</span>
                  <Badge tone={o.budget > decision.budgetLimit ? "signal" : "neutral"} className="mono-num">
                    {eur(o.budget)}
                  </Badge>
                </span>
                <span className="mt-1 block text-sm text-text-secondary">{o.text}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {!submitted ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!selected} onClick={() => setSubmitted(selected)}>
            Valider ma décision
          </Button>
          <p className="text-xs text-text-muted">Aperçu interactif : aucune donnée n&apos;est enregistrée.</p>
        </div>
      ) : (
        chosen && (
          <div className="space-y-3" aria-live="polite">
            {checks.map((c) => (
              <Alert key={c.constraintKey} tone={c.satisfied ? "success" : "warning"} title={c.satisfied ? "Contrainte respectée" : "Alerte contrainte"}>
                {formatConstraintAlert(c)}
              </Alert>
            ))}
            <Alert tone={chosen.tone === "danger" ? "danger" : chosen.tone === "warning" ? "warning" : "info"} title="Conséquence">
              {chosen.consequence}
            </Alert>
            <Alert tone="info" title="Feedback pédagogique">
              {chosen.feedback}
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSubmitted(null);
                  setSelected(null);
                }}
              >
                Rejouer la décision
              </Button>
              <Button disabled aria-disabled="true" title="Disponible dans la mission complète (phase 11)">
                Passer à l&apos;étape 4 · Construire le budget
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
