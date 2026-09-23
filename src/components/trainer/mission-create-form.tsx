"use client";

import { useActionState } from "react";
import { createMissionAction } from "@/actions/mission-editor-actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { MissionBasicsFields } from "@/components/trainer/mission-form-fields";
import { ButtonLink } from "@/components/ui/button";

export function MissionCreateForm() {
  const [state, action] = useActionState(createMissionAction, undefined);
  return (
    <form action={action} aria-label="Créer une mission" className="space-y-5" noValidate>
      <FormFeedback state={state} />
      <MissionBasicsFields errors={state?.fieldErrors} values={state?.values} />
      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton size="lg" pendingLabel="Création…">
          Créer la mission
        </SubmitButton>
        <ButtonLink href="/app/trainer/missions" variant="ghost" size="lg">
          Annuler
        </ButtonLink>
      </div>
      <p className="text-xs text-text-muted">
        La mission est créée en brouillon. Vous compléterez ensuite le briefing, le rôle de l&apos;apprenant, les contraintes et les étapes.
      </p>
    </form>
  );
}
