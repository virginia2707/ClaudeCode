"use client";

import { useActionState } from "react";
import { joinSessionAction, type JoinState } from "@/actions/play";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function JoinSessionForm({ code, teamMode, running }: { code: string; teamMode: boolean; running: boolean }) {
  const [state, action, pending] = useActionState(joinSessionAction.bind(null, code), { ok: true } as JoinState);
  const err = (k: string) => (!state.ok ? state.fields?.[k] : undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {!state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      {running ? <Alert tone="info">La mission a déjà commencé : vous rejoindrez en cours de route.</Alert> : null}
      <Field label="Prénom" htmlFor="firstName" required error={err("firstName")}>
        <Input id="firstName" name="firstName" required maxLength={40} autoComplete="given-name" defaultValue={state.values?.firstName ?? ""} />
      </Field>
      <Field label="Nom ou pseudonyme" htmlFor="displayName" required error={err("displayName")} hint="Visible par le formateur et dans le classement.">
        <Input id="displayName" name="displayName" required maxLength={40} defaultValue={state.values?.displayName ?? ""} />
      </Field>
      {teamMode ? (
        <Field label="Équipe" htmlFor="teamName" required error={err("teamName")} hint="Saisissez le nom exact communiqué par le formateur pour rejoindre vos coéquipiers.">
          <Input id="teamName" name="teamName" required maxLength={40} defaultValue={state.values?.teamName ?? ""} placeholder="Équipe Alpha" />
        </Field>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Entrer dans la mission"}
      </Button>
    </form>
  );
}
