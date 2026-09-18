"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth-actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormFeedback state={state} />
      <Field id="email" label="Email" error={state?.fieldErrors?.email} required>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" defaultValue={state?.values?.email} />}
      </Field>
      <Field id="password" label="Mot de passe" error={state?.fieldErrors?.password} required>
        {(p) => <Input {...p} name="password" type="password" autoComplete="current-password" />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
      <p className="text-center text-sm text-text-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
