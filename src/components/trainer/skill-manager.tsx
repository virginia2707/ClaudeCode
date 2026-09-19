"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { createSkillAction, deleteSkillAction, importSkillAction, updateSkillAction } from "@/actions/skill-actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { ConfirmAction, InlineAction } from "@/components/trainer/confirm-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

export type SkillRow = { id: string; name: string; description: string | null; category: string | null; usedBy: number };
export type GlobalSkillRow = { id: string; name: string; description: string | null; category: string | null; imported: boolean };

export function SkillCreateForm() {
  const [state, action] = useActionState(createSkillAction, undefined);
  return (
    <form action={action} aria-label="Ajouter une compétence" className="space-y-3" noValidate>
      <FormFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field id="skill-name" label="Nom" error={state?.fieldErrors?.name} required>
          {(p) => <Input {...p} name="name" placeholder="Analyse de données" />}
        </Field>
        <Field id="skill-category" label="Catégorie" hint="Optionnelle : Analyse, Communication, Gestion…" error={state?.fieldErrors?.category}>
          {(p) => <Input {...p} name="category" placeholder="Analyse" />}
        </Field>
        <SubmitButton pendingLabel="Ajout…">Ajouter</SubmitButton>
      </div>
      <Field id="skill-description" label="Description" hint="Optionnelle : ce que l'apprenant doit savoir faire." error={state?.fieldErrors?.description}>
        {(p) => <Input {...p} name="description" placeholder="Lire un tableau de bord et en tirer une priorité d'action." />}
      </Field>
    </form>
  );
}

function SkillEditForm({ skill, onDone }: { skill: SkillRow; onDone: () => void }) {
  const [state, action] = useActionState(updateSkillAction, undefined);
  // Une modification enregistrée referme l'éditeur : la ligne réaffiche alors
  // la valeur à jour, au lieu de laisser un formulaire ouvert sans repère.
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);
  return (
    <form action={action} aria-label={`Modifier ${skill.name}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
      <input type="hidden" name="skillId" value={skill.id} />
      <Field id={`edit-name-${skill.id}`} label="Nom" error={state?.fieldErrors?.name} required>
        {(p) => <Input {...p} name="name" defaultValue={skill.name} />}
      </Field>
      <Field id={`edit-category-${skill.id}`} label="Catégorie" error={state?.fieldErrors?.category}>
        {(p) => <Input {...p} name="category" defaultValue={skill.category ?? ""} />}
      </Field>
      <div className="flex gap-2">
        <SubmitButton pendingLabel="…">Enregistrer</SubmitButton>
        <Button variant="ghost" size="md" onClick={onDone}>
          Fermer
        </Button>
      </div>
      <div className="sm:col-span-3">
        <Field id={`edit-description-${skill.id}`} label="Description" error={state?.fieldErrors?.description}>
          {(p) => <Input {...p} name="description" defaultValue={skill.description ?? ""} />}
        </Field>
      </div>
      {state?.error && (
        <p role="alert" className="text-xs text-danger sm:col-span-3">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-xs text-success sm:col-span-3">
          {state.success}
        </p>
      )}
    </form>
  );
}

export function SkillList({ skills }: { skills: SkillRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const closeEditor = useCallback(() => setEditing(null), []);
  return (
    <ul aria-label="Référentiel de l'organisation" className="divide-y divide-border">
      {skills.map((skill) => (
        <li key={skill.id} className="py-4">
          {editing === skill.id ? (
            <SkillEditForm skill={skill} onDone={closeEditor} />
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{skill.name}</p>
                  {skill.category && <Badge>{skill.category}</Badge>}
                  {skill.usedBy > 0 && <Badge tone="info">{skill.usedBy} mission{skill.usedBy > 1 ? "s" : ""}</Badge>}
                </div>
                {skill.description && <p className="mt-0.5 text-sm text-text-secondary">{skill.description}</p>}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(skill.id)}>
                  Modifier
                </Button>
                <ConfirmAction
                  action={deleteSkillAction}
                  hiddenFields={{ skillId: skill.id }}
                  label="Supprimer"
                  confirmLabel="Supprimer"
                  question="Confirmer ?"
                />
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function GlobalSkillList({ skills }: { skills: GlobalSkillRow[] }) {
  return (
    <Card variant="inset" className="p-4">
      <ul aria-label="Bibliothèque MissionIA" className="grid gap-2 sm:grid-cols-2">
        {skills.map((skill) => (
          <li key={skill.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm">{skill.name}</p>
              {skill.category && <p className="text-xs text-text-muted">{skill.category}</p>}
            </div>
            {skill.imported ? (
              <Badge tone="success">ajoutée</Badge>
            ) : (
              <InlineAction action={importSkillAction} hiddenFields={{ skillId: skill.id }} label="Ajouter" pendingLabel="…" />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
