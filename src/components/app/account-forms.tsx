"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/account";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/action-result";

const initial: ActionResult = { ok: true };

function Feedback({ state }: { state: ActionResult }) {
  if (!state.ok) return <Alert tone="danger">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function ProfileForm({ firstName, lastName, email }: { firstName: string; lastName: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="card p-5 space-y-4" noValidate>
      <h2 className="font-semibold">Profil</h2>
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" defaultValue={firstName} required maxLength={60} />
        </Field>
        <Field label="Nom" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" defaultValue={lastName} required maxLength={60} />
        </Field>
      </div>
      <Field label="E-mail" htmlFor="email" hint="L'adresse e-mail ne peut pas être modifiée pour le moment.">
        <Input id="email" value={email} readOnly disabled />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="card p-5 space-y-4" noValidate>
      <h2 className="font-semibold">Mot de passe</h2>
      <Feedback state={state} />
      <Field label="Mot de passe actuel" htmlFor="current" required>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Nouveau mot de passe" htmlFor="next" required hint="8 caractères minimum, avec une lettre et un chiffre.">
        <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Confirmer" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Modification…" : "Modifier le mot de passe"}
      </Button>
    </form>
  );
}
