"use client";

import { useActionState } from "react";
import { joinSimulationAction } from "@/actions/play-actions";
import { SubmitButton } from "@/components/submit-button";

export function JoinForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, formAction] = useActionState(joinSimulationAction, undefined);

  return (
    <form action={formAction} className="card p-6 flex flex-col sm:flex-row gap-3 items-end">
      <div className="flex-1 w-full">
        <label className="label" htmlFor="accessCode">Code d&apos;accès</label>
        <input
          className="input uppercase"
          id="accessCode"
          name="accessCode"
          placeholder="AURORA26"
          defaultValue={defaultCode}
          required
        />
      </div>
      <SubmitButton className="btn btn-primary" pendingText="Connexion…">
        Rejoindre la simulation
      </SubmitButton>
      {state?.error && <p className="text-sm text-danger sm:ml-3">{state.error}</p>}
    </form>
  );
}
