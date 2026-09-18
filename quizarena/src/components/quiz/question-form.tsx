"use client";

import { useActionState } from "react";
import { saveQuestionAction } from "@/actions/question";
import { idleState, type ActionState } from "@/lib/action-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;
const COLORS = ["bg-answer-a", "bg-answer-b", "bg-answer-c", "bg-answer-d"] as const;

export type QuestionFormValues = Record<string, string>;

export function QuestionForm({
  quizId,
  questionId,
  initial,
  defaults,
}: {
  quizId: string;
  questionId: string | null;
  initial?: QuestionFormValues;
  defaults: { timeLimit: number; points: number };
}) {
  const bound = saveQuestionAction.bind(null, quizId, questionId);
  const [state, action, pending] = useActionState<ActionState, FormData>(bound, idleState);
  const v = { ...(initial ?? {}), ...(state.values ?? {}) };
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Question" htmlFor="text" error={fe.text}>
        <Textarea id="text" name="text" required defaultValue={v.text} placeholder="Quelle fonction Excel permet de rechercher une valeur dans un tableau selon une clé ?" aria-invalid={!!fe.text} />
      </Field>
      <Field label="Image (URL, facultatif)" htmlFor="imageUrl" error={fe.imageUrl}>
        <Input id="imageUrl" name="imageUrl" type="url" defaultValue={v.imageUrl} placeholder="https://…" aria-invalid={!!fe.imageUrl} />
      </Field>

      <fieldset>
        <legend className="label">Réponses — cochez la bonne réponse</legend>
        {fe.correctIndex ? (
          <p className="mb-2 text-sm text-danger" role="alert">
            {fe.correctIndex}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {LETTERS.map((letter, i) => (
            <div key={letter} className={cn("card-2 flex items-center gap-3 p-3", fe[`answer_${i}`] && "border-danger")}>
              <label className="flex cursor-pointer items-center gap-2" title="Bonne réponse">
                <input
                  type="radio"
                  name="correctIndex"
                  value={i}
                  defaultChecked={v.correctIndex === String(i)}
                  className="accent-[var(--success)]"
                  aria-label={`Réponse ${letter} est la bonne réponse`}
                />
                <span className={cn("grid size-7 place-items-center rounded-md text-xs font-black text-black/80", COLORS[i])}>{letter}</span>
              </label>
              <div className="flex-1">
                <input
                  id={`answer_${i}`}
                  name={`answer_${i}`}
                  className="input"
                  required
                  defaultValue={v[`answer_${i}`]}
                  placeholder={`Réponse ${letter}`}
                  aria-label={`Texte de la réponse ${letter}`}
                  aria-invalid={!!fe[`answer_${i}`]}
                />
                {fe[`answer_${i}`] ? <p className="mt-1 text-xs text-danger">{fe[`answer_${i}`]}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <Field label="Explication pédagogique" htmlFor="explanation" error={fe.explanation} hint="Affichée après la question si le feedback est activé.">
        <Textarea id="explanation" name="explanation" defaultValue={v.explanation} placeholder="RECHERCHEX permet de rechercher une valeur dans une plage et de renvoyer une valeur correspondante." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Difficulté" htmlFor="difficulty" error={fe.difficulty}>
          <Select id="difficulty" name="difficulty" defaultValue={v.difficulty ?? "MEDIUM"}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Temps (secondes)" htmlFor="timeLimit" error={fe.timeLimit}>
          <Input id="timeLimit" name="timeLimit" type="number" min={5} max={300} defaultValue={v.timeLimit ?? String(defaults.timeLimit)} />
        </Field>
        <Field label="Points" htmlFor="points" error={fe.points}>
          <Input id="points" name="points" type="number" min={0} max={10000} step={50} defaultValue={v.points ?? String(defaults.points)} />
        </Field>
        <Field label="Catégorie" htmlFor="category" error={fe.category}>
          <Input id="category" name="category" defaultValue={v.category} placeholder="Ex. Formules" />
        </Field>
      </div>
      <Field label="Compétences associées" htmlFor="skills" error={fe.skills} hint="Séparées par des virgules. Ex. Planification, Gestion des risques">
        <Input id="skills" name="skills" defaultValue={v.skills} placeholder="Recherche de données, Formules" />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ButtonLink href={`/quizzes/${quizId}`} variant="ghost">
          Annuler
        </ButtonLink>
        <div className="flex flex-col gap-2 sm:flex-row">
          {!questionId ? (
            <Button type="submit" name="intent" value="add-another" variant="secondary" loading={pending}>
              Enregistrer et ajouter une autre
            </Button>
          ) : null}
          <Button type="submit" name="intent" value="save" loading={pending}>
            {questionId ? "Enregistrer la question" : "Enregistrer et revenir au quiz"}
          </Button>
        </div>
      </div>
    </form>
  );
}
