"use client";

import { useActionState } from "react";
import { inviteMemberAction } from "@/actions/org-actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, Input, Select } from "@/components/ui/field";

export function InviteForm({ canInviteAdmin }: { canInviteAdmin: boolean }) {
  const [state, action] = useActionState(inviteMemberAction, undefined);
  return (
    <form action={action} aria-label="Inviter un membre" className="space-y-3" noValidate>
      <FormFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <Field id="invite-email" label="Email" error={state?.fieldErrors?.email} required>
          {(p) => <Input {...p} name="email" type="email" placeholder="prenom.nom@exemple.fr" />}
        </Field>
        <Field id="invite-role" label="Rôle" error={state?.fieldErrors?.role} required>
          {(p) => (
            <Select {...p} name="role" defaultValue="LEARNER">
              <option value="LEARNER">Apprenant</option>
              <option value="TRAINER">Formateur</option>
              {canInviteAdmin && <option value="ADMIN">Administrateur</option>}
            </Select>
          )}
        </Field>
        <SubmitButton pendingLabel="Création…">Inviter</SubmitButton>
      </div>
    </form>
  );
}
