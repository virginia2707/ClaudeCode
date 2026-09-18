"use client";

import { useActionState } from "react";
import { joinGameAction } from "@/actions/join";
import { idleState, type ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type GameInfo = { title: string; mode: string; teams: { id: string; name: string; color: string }[]; status: string } | null;

export function JoinForm({ initialCode, initialNickname, gameInfo, lookupError }: { initialCode: string; initialNickname: string; gameInfo: GameInfo; lookupError: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(joinGameAction, idleState);
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  const teamMode = gameInfo?.mode === "TEAM";
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {lookupError ? <Alert tone="danger">{lookupError}</Alert> : null}
      {gameInfo ? (
        <Alert tone="info" title={gameInfo.title}>
          {gameInfo.status === "LOBBY" ? "La partie est en salle d'attente." : "La partie a déjà commencé."}
        </Alert>
      ) : null}
      <Field label="Code de partie" htmlFor="code" error={fe.code}>
        <Input
          id="code"
          name="code"
          required
          defaultValue={v.code ?? initialCode}
          placeholder="A7K92P"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          className="code-display text-center text-2xl"
          aria-invalid={!!fe.code}
        />
      </Field>
      <Field label="Prénom ou pseudo" htmlFor="nickname" error={fe.nickname} hint="Entre 2 et 24 caractères, visible par les autres participants.">
        <Input id="nickname" name="nickname" required defaultValue={v.nickname ?? initialNickname} placeholder="Virginia" maxLength={24} autoComplete="nickname" aria-invalid={!!fe.nickname} />
      </Field>
      {teamMode && gameInfo ? (
        <fieldset>
          <legend className="label">Équipe</legend>
          <input type="hidden" name="teamsShown" value="1" />
          {fe.teamId ? (
            <p className="mb-2 text-sm text-danger" role="alert">
              {fe.teamId}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {gameInfo.teams.map((t) => (
              <label key={t.id} className={cn("card-2 flex cursor-pointer items-center gap-2 px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary-soft")}>
                <input type="radio" name="teamId" value={t.id} defaultChecked={v.teamId === t.id} className="accent-[var(--primary)]" />
                <span className="size-3 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                <span className="font-medium">{t.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Entrer dans l&apos;arène
      </Button>
    </form>
  );
}
