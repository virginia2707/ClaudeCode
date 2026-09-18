"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { registerAction } from "@/actions/auth-actions";
import { SubmitButton } from "@/components/submit-button";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, undefined);
  const params = useSearchParams();
  const defaultRole = params.get("role") === "FORMATEUR" ? "FORMATEUR" : "APPRENANT";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Nom
        </label>
        <input className="input" id="name" name="name" required autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Mot de passe
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="label" htmlFor="role">
          Je suis…
        </label>
        <select className="input" id="role" name="role" defaultValue={defaultRole}>
          <option value="APPRENANT">Apprenant — je rejoins une simulation</option>
          <option value="FORMATEUR">Formateur — je crée des simulations</option>
        </select>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <SubmitButton className="btn btn-primary w-full">Créer mon compte</SubmitButton>
    </form>
  );
}
