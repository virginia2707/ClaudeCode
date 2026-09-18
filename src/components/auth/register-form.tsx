"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction } from "@/actions/auth-actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

type Props = {
  invite?: { token: string; email: string; organizationName: string; role: string } | null;
};

const TYPES = [
  { value: "TRAINER", title: "Formateur", text: "Je crée des missions et je lance des sessions. Une organisation est créée pour moi." },
  { value: "LEARNER", title: "Apprenant", text: "Je rejoins des missions sur invitation de mon formateur." },
] as const;

export function RegisterForm({ invite }: Props) {
  const [state, action] = useActionState(registerAction, undefined);
  const [type, setType] = useState<"TRAINER" | "LEARNER">(invite ? "LEARNER" : (state?.values?.accountType as "TRAINER" | "LEARNER") || "TRAINER");

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormFeedback state={state} />
      {invite ? (
        <>
          <input type="hidden" name="inviteToken" value={invite.token} />
          <input type="hidden" name="accountType" value="LEARNER" />
          <div className="alert alert-info text-sm">
            Vous rejoignez <span className="font-semibold text-text">{invite.organizationName}</span> en tant que {invite.role.toLowerCase()}.
          </div>
        </>
      ) : (
        <fieldset>
          <legend className="label">Vous êtes</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  type === t.value ? "border-accent bg-accent-soft" : "border-border bg-bg-elevated hover:border-border-strong",
                )}
              >
                <input type="radio" name="accountType" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="mt-1 accent-[var(--accent)]" />
                <span>
                  <span className="block font-semibold">{t.title}</span>
                  <span className="block text-xs text-text-secondary">{t.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field id="name" label="Nom complet" error={state?.fieldErrors?.name} required>
        {(p) => <Input {...p} name="name" autoComplete="name" defaultValue={state?.values?.name} />}
      </Field>
      <Field id="email" label="Email" error={state?.fieldErrors?.email} required hint={invite ? "Adresse de l'invitation." : undefined}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" defaultValue={invite?.email ?? state?.values?.email} readOnly={!!invite} />}
      </Field>
      {type === "TRAINER" && !invite && (
        <Field id="organizationName" label="Organisation" hint="Nom de votre organisme, école ou entreprise. Indépendant ? Votre nom suffit." error={state?.fieldErrors?.organizationName} required>
          {(p) => <Input {...p} name="organizationName" autoComplete="organization" defaultValue={state?.values?.organizationName} />}
        </Field>
      )}
      <Field id="password" label="Mot de passe" hint="10 caractères minimum, au moins une lettre et un chiffre." error={state?.fieldErrors?.password} required>
        {(p) => <Input {...p} name="password" type="password" autoComplete="new-password" />}
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Création du compte…">
        {invite ? "Créer mon compte et rejoindre" : "Créer mon compte"}
      </SubmitButton>
      <p className="text-center text-sm text-text-muted">
        Déjà un compte ?{" "}
        <Link href={invite ? `/login?next=${encodeURIComponent(`/invite/${invite.token}`)}` : "/login"} className="text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
