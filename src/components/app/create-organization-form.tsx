"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/actions/auth-actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, Input } from "@/components/ui/field";

export function CreateOrganizationForm() {
  const [state, action] = useActionState(createOrganizationAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
      <div className="flex-1">
        <FormFeedback state={state} />
        <Field id="org-name" label="Nom de l'organisation" error={state?.fieldErrors?.name} required>
          {(p) => <Input {...p} name="name" placeholder="NovaSkills Formation" />}
        </Field>
      </div>
      <SubmitButton pendingLabel="Création…">Créer mon organisation</SubmitButton>
    </form>
  );
}
