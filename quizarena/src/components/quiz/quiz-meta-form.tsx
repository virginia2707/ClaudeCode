"use client";

import { useActionState } from "react";
import { createQuizAction, updateQuizMetaAction } from "@/actions/quiz";
import { idleState, type ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/constants";

type Values = { title?: string; description?: string; category?: string; level?: string };

export function QuizMetaForm({ quizId, initial }: { quizId?: string; initial?: Values }) {
  const bound = quizId ? updateQuizMetaAction.bind(null, quizId) : createQuizAction;
  const [state, action, pending] = useActionState<ActionState, FormData>(bound, idleState);
  const v = { ...initial, ...(state.values ?? {}) };
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">Modifications enregistrées.</Alert> : null}
      <Field label="Titre" htmlFor="title" error={fe.title}>
        <Input id="title" name="title" required defaultValue={v.title} placeholder="Ex. Les fondamentaux de l'IA" aria-invalid={!!fe.title} />
      </Field>
      <Field label="Description" htmlFor="description" error={fe.description} hint="Visible par les apprenants dans la salle d'attente.">
        <Textarea id="description" name="description" defaultValue={v.description} placeholder="Objectifs pédagogiques, public visé…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="category" error={fe.category}>
          <Input id="category" name="category" defaultValue={v.category} placeholder="Ex. Bureautique, Gestion de projet" />
        </Field>
        <Field label="Niveau" htmlFor="level" error={fe.level}>
          <Select id="level" name="level" defaultValue={v.level ?? "MEDIUM"}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          {quizId ? "Enregistrer" : "Créer le quiz et ajouter des questions"}
        </Button>
      </div>
    </form>
  );
}
