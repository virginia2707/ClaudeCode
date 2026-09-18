"use client";

import { useActionState } from "react";
import { lookupSessionAction, type JoinLookupState } from "@/actions/join";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function JoinCodeForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(lookupSessionAction, {} as JoinLookupState);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <label htmlFor="code" className="label">
          Code de session
        </label>
        <input
          id="code"
          name="code"
          className="input input-code"
          placeholder="X7K9P2"
          maxLength={7}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          required
          defaultValue={state.code ?? initialCode}
          aria-invalid={Boolean(state.error)}
          aria-describedby="code-hint"
        />
        <p id="code-hint" className="mt-1.5 text-xs text-text-subtle">
          6 caractères, communiqués par votre formateur ou via le QR code.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Recherche…" : "Rejoindre la mission"}
      </Button>
    </form>
  );
}
