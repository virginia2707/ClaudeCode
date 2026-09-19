"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button, type ButtonVariant } from "@/components/ui/button";
import type { FormState } from "@/lib/auth/schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Bouton d'action en deux temps : un premier clic demande confirmation, le
 * second exécute. Pas de `window.confirm` (non stylable, mal annoncé), et le
 * résultat de l'action est affiché sous le bouton.
 */
export function ConfirmAction({
  action,
  hiddenFields,
  label,
  confirmLabel,
  question,
  variant = "ghost",
  pendingLabel = "…",
}: {
  action: Action;
  hiddenFields: Record<string, string>;
  label: string;
  confirmLabel: string;
  question: string;
  variant?: ButtonVariant;
  pendingLabel?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-col items-start gap-1">
      {armed ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2" onSubmit={() => setArmed(false)}>
          {Object.entries(hiddenFields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <span className="text-xs text-text-secondary">{question}</span>
          <SubmitButton variant="danger" size="sm" pendingLabel={pendingLabel}>
            {confirmLabel}
          </SubmitButton>
          <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
            Annuler
          </Button>
        </form>
      ) : (
        <Button variant={variant} size="sm" onClick={() => setArmed(true)}>
          {label}
        </Button>
      )}
      {(state?.error || state?.success) && (
        <p role="status" className={`text-xs ${state.error ? "text-danger" : "text-success"}`}>
          {state.error ?? state.success}
        </p>
      )}
    </div>
  );
}

/** Action simple, sans confirmation, avec retour d'état. */
export function InlineAction({
  action,
  hiddenFields,
  label,
  variant = "secondary",
  pendingLabel = "…",
}: {
  action: Action;
  hiddenFields: Record<string, string>;
  label: string;
  variant?: ButtonVariant;
  pendingLabel?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <div className="flex flex-col items-start gap-1">
      <form action={formAction}>
        {Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <SubmitButton variant={variant} size="sm" pendingLabel={pendingLabel}>
          {label}
        </SubmitButton>
      </form>
      {(state?.error || state?.success) && (
        <p role="status" className={`max-w-xs text-xs ${state.error ? "text-danger" : "text-success"}`}>
          {state.error ?? state.success}
        </p>
      )}
    </div>
  );
}
