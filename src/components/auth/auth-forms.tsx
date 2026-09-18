"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/actions/auth";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initial: AuthFormState = {};

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? "Un instant…" : children}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="E-mail" htmlFor="email" error={state.fields?.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email ?? ""}
          aria-invalid={Boolean(state.fields?.email)}
          aria-describedby={state.fields?.email ? "email-error" : undefined}
        />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={state.fields?.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fields?.password)}
          aria-describedby={state.fields?.password ? "password-error" : undefined}
        />
      </Field>
      <SubmitButton pending={pending}>Se connecter</SubmitButton>
      <p className="text-center text-sm text-text-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-accent underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, initial);
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" error={state.fields?.firstName} required>
          <Input id="firstName" name="firstName" autoComplete="given-name" required defaultValue={v.firstName ?? ""} aria-invalid={Boolean(state.fields?.firstName)} />
        </Field>
        <Field label="Nom" htmlFor="lastName" error={state.fields?.lastName} required>
          <Input id="lastName" name="lastName" autoComplete="family-name" required defaultValue={v.lastName ?? ""} aria-invalid={Boolean(state.fields?.lastName)} />
        </Field>
      </div>
      <Field label="E-mail professionnel" htmlFor="email" error={state.fields?.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email ?? ""} aria-invalid={Boolean(state.fields?.email)} />
      </Field>
      <Field
        label="Mot de passe"
        htmlFor="password"
        error={state.fields?.password}
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
        required
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(state.fields?.password)} />
      </Field>
      <Field label="Je suis" htmlFor="accountType" error={state.fields?.accountType}>
        <Select id="accountType" name="accountType" defaultValue={v.accountType ?? "TRAINER"}>
          <option value="TRAINER">Formateur / formatrice</option>
          <option value="LEARNER">Apprenant(e)</option>
        </Select>
      </Field>
      <div>
        <label className="flex items-start gap-2.5 text-sm text-text-muted">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" required aria-describedby={state.fields?.acceptTerms ? "acceptTerms-error" : undefined} />
          <span>J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité.</span>
        </label>
        {state.fields?.acceptTerms ? (
          <p id="acceptTerms-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {state.fields.acceptTerms}
          </p>
        ) : null}
      </div>
      <SubmitButton pending={pending}>Créer mon compte</SubmitButton>
      <p className="text-center text-sm text-text-muted">
        Déjà inscrit ?{" "}
        <Link href="/login" className="text-accent underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
