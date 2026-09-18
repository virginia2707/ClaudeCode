"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { idleState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, idleState);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const role = v.role ?? "TRAINER";
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="label">Je suis</legend>
        {[
          ["TRAINER", "Formateur"],
          ["LEARNER", "Apprenant"],
        ].map(([value, label]) => (
          <label key={value} className="card-2 flex cursor-pointer items-center justify-center gap-2 px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
            <input type="radio" name="role" value={value} defaultChecked={role === value} className="accent-[var(--primary)]" />
            <span className="font-medium">{label}</span>
          </label>
        ))}
      </fieldset>
      <Field label="Nom" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" required defaultValue={v.name} aria-invalid={!!fe.name} />
      </Field>
      <Field label="E-mail" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} aria-invalid={!!fe.email} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum" error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!fe.password} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Créer mon compte
      </Button>
      <p className="text-center text-sm text-text-muted">
        Déjà un compte ?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-primary-strong hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, idleState);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="E-mail" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email} aria-invalid={!!fe.email} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!fe.password} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Se connecter
      </Button>
      <p className="text-center text-sm text-text-muted">
        Pas encore de compte ?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-primary-strong hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
