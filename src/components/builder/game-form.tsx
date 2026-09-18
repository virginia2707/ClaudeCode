"use client";

import { useActionState } from "react";
import { createGameAction, updateGameAction, type GameFormState } from "@/actions/game-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FileUpload } from "@/components/builder/file-upload";
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTIES, DIFFICULTY_LABELS, LEVELS, LEVEL_LABELS } from "@/lib/constants";

export type GameFormValues = {
  title: string;
  description: string;
  category: string;
  level: string;
  difficulty: string;
  estimatedMinutes: number;
  objective: string;
  targetSkills: string;
  scenario: string;
  introduction: string;
  finalMessage: string;
  coverImageUrl: string;
  mode: string;
  maxParticipants: number;
};

export const defaultGameValues: GameFormValues = {
  title: "",
  description: "",
  category: "BUREAUTIQUE",
  level: "INTERMEDIATE",
  difficulty: "MEDIUM",
  estimatedMinutes: 45,
  objective: "",
  targetSkills: "",
  scenario: "",
  introduction: "",
  finalMessage: "",
  coverImageUrl: "",
  mode: "INDIVIDUAL",
  maxParticipants: 30,
};

export function GameForm({ gameId, initial, cancelHref }: { gameId?: string; initial: GameFormValues; cancelHref: string }) {
  const action = gameId ? updateGameAction.bind(null, gameId) : createGameAction;
  const [state, formAction, pending] = useActionState(action, { ok: true } as GameFormState);
  const v = (key: keyof GameFormValues) => (state.values && key in state.values ? state.values[key] : String(initial[key] ?? ""));
  const err = (key: string) => (!state.ok ? state.fields?.[key] : undefined);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {!state.ok ? <Alert tone="danger">{state.error}</Alert> : state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <section className="card p-5 space-y-4" aria-labelledby="sec-infos">
        <h2 id="sec-infos" className="font-semibold">
          Informations
        </h2>
        <Field label="Titre" htmlFor="title" required error={err("title")} hint="Ex. : Mission Excel — Le reporting disparu">
          <Input id="title" name="title" required maxLength={120} defaultValue={v("title")} aria-invalid={Boolean(err("title"))} />
        </Field>
        <Field label="Description" htmlFor="description" error={err("description")} hint="Présentée aux apprenants avant de commencer.">
          <Textarea id="description" name="description" maxLength={1000} rows={3} defaultValue={v("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Catégorie" htmlFor="category" error={err("category")}>
            <Select id="category" name="category" defaultValue={v("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Niveau" htmlFor="level" error={err("level")}>
            <Select id="level" name="level" defaultValue={v("level")}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Difficulté" htmlFor="difficulty" error={err("difficulty")}>
            <Select id="difficulty" name="difficulty" defaultValue={v("difficulty")}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <FileUpload name="coverImageUrl" label="Image de couverture" accept="image/png,image/jpeg,image/webp" defaultUrl={v("coverImageUrl")} preview="image" hint="PNG, JPEG ou WebP, 20 Mo max. Facultatif." />
        {err("coverImageUrl") ? <p className="text-xs text-danger">{err("coverImageUrl")}</p> : null}
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="sec-peda">
        <h2 id="sec-peda" className="font-semibold">
          Pédagogie
        </h2>
        <Field label="Objectif pédagogique" htmlFor="objective" error={err("objective")} hint="Ce que l'apprenant doit savoir faire à la fin.">
          <Textarea id="objective" name="objective" maxLength={1000} rows={2} defaultValue={v("objective")} />
        </Field>
        <Field label="Compétences travaillées" htmlFor="targetSkills" error={err("targetSkills")} hint="Séparées par des virgules. Elles sont ajoutées à votre bibliothèque de compétences.">
          <Input id="targetSkills" name="targetSkills" maxLength={600} placeholder="Formules simples, Références absolues, Recherche de données" defaultValue={v("targetSkills")} />
        </Field>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="sec-scenario">
        <h2 id="sec-scenario" className="font-semibold">
          Scénario
        </h2>
        <Field label="Scénario" htmlFor="scenario" error={err("scenario")} hint="La situation professionnelle. Ex. : « Il est 16h30. Le reporting mensuel doit être envoyé à 17h… »">
          <Textarea id="scenario" name="scenario" maxLength={4000} rows={5} defaultValue={v("scenario")} />
        </Field>
        <Field label="Introduction (écran d'accueil)" htmlFor="introduction" error={err("introduction")} hint="Consignes générales affichées avant la première étape. Facultatif.">
          <Textarea id="introduction" name="introduction" maxLength={2000} rows={3} defaultValue={v("introduction")} />
        </Field>
        <Field label="Message de fin de mission" htmlFor="finalMessage" error={err("finalMessage")} hint="Affiché quand la mission est réussie. Facultatif.">
          <Textarea id="finalMessage" name="finalMessage" maxLength={2000} rows={3} defaultValue={v("finalMessage")} />
        </Field>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="sec-config">
        <h2 id="sec-config" className="font-semibold">
          Configuration
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Durée estimée (min)" htmlFor="estimatedMinutes" required error={err("estimatedMinutes")}>
            <Input id="estimatedMinutes" name="estimatedMinutes" type="number" min={5} max={480} required defaultValue={v("estimatedMinutes")} aria-invalid={Boolean(err("estimatedMinutes"))} />
          </Field>
          <Field label="Mode" htmlFor="mode" error={err("mode")}>
            <Select id="mode" name="mode" defaultValue={v("mode")}>
              <option value="INDIVIDUAL">Individuel</option>
              <option value="TEAM">En équipe</option>
            </Select>
          </Field>
          <Field label="Participants max" htmlFor="maxParticipants" required error={err("maxParticipants")}>
            <Input id="maxParticipants" name="maxParticipants" type="number" min={1} max={1000} required defaultValue={v("maxParticipants")} aria-invalid={Boolean(err("maxParticipants"))} />
          </Field>
        </div>
        <p className="text-xs text-text-subtle">Le chronomètre, le scoring et le classement se règlent dans « Réglages du jeu » une fois le jeu créé.</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : gameId ? "Enregistrer" : "Créer et passer aux étapes"}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}
