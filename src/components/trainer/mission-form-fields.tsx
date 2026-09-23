"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { LEVELS, LEVEL_LABELS, MISSION_MODES } from "@/lib/constants";

type Errors = Record<string, string> | undefined;
type Values = Record<string, string> | undefined;

const MODE_LABELS: Record<(typeof MISSION_MODES)[number], string> = {
  INDIVIDUAL: "Individuel",
  TEAM: "Équipe",
};

/** Champs de la fiche mission, partagés entre la création et l'édition. */
export function MissionBasicsFields({
  errors,
  values,
  prefix = "",
  defaults,
}: {
  errors: Errors;
  values: Values;
  prefix?: string;
  defaults?: {
    title?: string;
    description?: string;
    sector?: string | null;
    jobTitle?: string | null;
    level?: string;
    difficulty?: string;
    durationMinutes?: number;
    mode?: string;
  };
}) {
  const id = (name: string) => `${prefix}${name}`;
  const value = (name: keyof NonNullable<typeof defaults>) => values?.[name] ?? (defaults?.[name] ?? "") ?? "";

  return (
    <>
      <Field id={id("title")} label="Titre de la mission" hint="Formulez-le comme un défi professionnel, pas comme un chapitre de cours." error={errors?.title} required>
        {(p) => <Input {...p} name="title" placeholder="48 heures pour lancer le produit" defaultValue={String(value("title"))} maxLength={120} />}
      </Field>

      <Field id={id("description")} label="Description" hint="Une ou deux phrases : ce que l'apprenant devra accomplir." error={errors?.description}>
        {(p) => <Textarea {...p} name="description" rows={2} placeholder="Construire une stratégie de lancement B2B sous contrainte de budget et de délai." defaultValue={String(value("description"))} />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id("sector")} label="Secteur professionnel" error={errors?.sector}>
          {(p) => <Input {...p} name="sector" placeholder="Marketing B2B" defaultValue={String(value("sector"))} />}
        </Field>
        <Field id={id("jobTitle")} label="Métier" error={errors?.jobTitle}>
          {(p) => <Input {...p} name="jobTitle" placeholder="Responsable marketing" defaultValue={String(value("jobTitle"))} />}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={id("level")} label="Niveau du public" error={errors?.level}>
          {(p) => (
            <Select {...p} name="level" defaultValue={String(value("level") || "INTERMEDIATE")}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id={id("difficulty")} label="Difficulté de la mission" error={errors?.difficulty}>
          {(p) => (
            <Select {...p} name="difficulty" defaultValue={String(value("difficulty") || "INTERMEDIATE")}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id={id("durationMinutes")} label="Durée (minutes)" error={errors?.durationMinutes}>
          {(p) => <Input {...p} name="durationMinutes" type="number" inputMode="numeric" min={5} max={480} defaultValue={String(value("durationMinutes") || 60)} />}
        </Field>
        <Field id={id("mode")} label="Mode" error={errors?.mode}>
          {(p) => (
            <Select {...p} name="mode" defaultValue={String(value("mode") || "INDIVIDUAL")}>
              {MISSION_MODES.map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </>
  );
}
