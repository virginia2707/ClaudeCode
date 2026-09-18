"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth-actions";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-semibold mb-1">
          THE <span className="text-accent">APPRENTICE</span>
        </h1>
        <p className="text-text-muted text-sm mb-6">Connectez-vous pour continuer votre carrière.</p>

        <form action={formAction} className="space-y-4">
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
              autoComplete="current-password"
            />
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <SubmitButton className="btn btn-primary w-full">Se connecter</SubmitButton>
        </form>

        <p className="text-sm text-text-muted mt-6 text-center">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-accent">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
