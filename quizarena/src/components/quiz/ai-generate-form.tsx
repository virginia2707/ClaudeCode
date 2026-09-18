"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { generateQuestionsAction, addGeneratedQuestionAction, type GenerateState } from "@/actions/ai";
import { idleState, type ActionState } from "@/lib/action-state";
import type { GeneratedQuestion } from "@/lib/ai/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;
const COLORS = ["bg-answer-a", "bg-answer-b", "bg-answer-c", "bg-answer-d"] as const;

export function AIGenerateForm({ quizId }: { quizId: string }) {
  const [state, action, pending] = useActionState<GenerateState, FormData>(generateQuestionsAction, idleState as GenerateState);

  return (
    <div className="space-y-6">
      <form action={action} className="card space-y-4 p-6" noValidate>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary-strong" aria-hidden="true" />
          <h2 className="font-semibold">Générer des questions avec l&apos;IA</h2>
        </div>
        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        <Field label="Sujet" htmlFor="topic" error={state.fieldErrors?.topic}>
          <Input id="topic" name="topic" required defaultValue={state.values?.topic} placeholder="Ex. Gestion de projet" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Niveau" htmlFor="level" error={state.fieldErrors?.level}>
            <Select id="level" name="level" defaultValue={state.values?.level ?? "MEDIUM"}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre de questions" htmlFor="count" error={state.fieldErrors?.count}>
            <Input id="count" name="count" type="number" min={1} max={20} defaultValue={state.values?.count ?? "5"} />
          </Field>
          <Field label="Type" htmlFor="type">
            <Input id="type" value="QCM" disabled />
          </Field>
        </div>
        <Field label="Compétences" htmlFor="skills" error={state.fieldErrors?.skills} hint="Séparées par des virgules. Ex. Planification, Gestion des risques, Communication">
          <Input id="skills" name="skills" defaultValue={state.values?.skills} placeholder="Planification, Gestion des risques, Communication" />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>
            <Sparkles className="size-4" aria-hidden="true" /> Générer
          </Button>
        </div>
      </form>

      {state.drafts && state.drafts.length > 0 ? (
        <div className="space-y-4">
          <Alert tone="info" title="Relisez chaque question avant de l'ajouter">
            Les questions ci-dessous sont des brouillons générés automatiquement. Elles ne sont jamais publiées : modifiez-les si
            besoin puis ajoutez-les une par une au quiz.
          </Alert>
          <ul className="space-y-4">
            {state.drafts.map((d, i) => (
              <li key={i}>
                <DraftQuestionCard quizId={quizId} draft={d} index={i} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DraftQuestionCard({ quizId, draft, index }: { quizId: string; draft: GeneratedQuestion; index: number }) {
  const bound = addGeneratedQuestionAction.bind(null, quizId);
  const [state, action, pending] = useActionState<ActionState, FormData>(bound, idleState);
  const [correctIndex, setCorrectIndex] = useState(draft.correctIndex);
  const added = !!state.ok;

  return (
    <form action={action} className={cn("card space-y-4 p-5", added && "border-success")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">Brouillon {index + 1}</span>
        {added ? (
          <span className="pill pill-success">
            <CheckCircle2 className="size-3.5" aria-hidden="true" /> Ajoutée au quiz
          </span>
        ) : null}
      </div>
      <fieldset disabled={added} className="space-y-4">
        <Field label="Question" htmlFor={`text-${index}`}>
          <Input id={`text-${index}`} name="text" defaultValue={draft.text} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {LETTERS.map((letter, i) => (
            <div key={letter} className="card-2 flex items-center gap-3 p-3">
              <label className="flex cursor-pointer items-center gap-2" title="Bonne réponse">
                <input
                  type="radio"
                  name="correctIndex"
                  value={i}
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  className="accent-[var(--success)]"
                  aria-label={`Réponse ${letter} est la bonne réponse`}
                />
                <span className={cn("grid size-7 place-items-center rounded-md text-xs font-black text-black/80", COLORS[i])}>{letter}</span>
              </label>
              <Input name={`answer_${i}`} defaultValue={draft.answers[i]} aria-label={`Texte de la réponse ${letter}`} className="flex-1" />
            </div>
          ))}
        </div>
        <Field label="Explication" htmlFor={`explanation-${index}`}>
          <Input id={`explanation-${index}`} name="explanation" defaultValue={draft.explanation} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Difficulté" htmlFor={`difficulty-${index}`}>
            <Select id={`difficulty-${index}`} name="difficulty" defaultValue={draft.difficulty}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Temps (s)" htmlFor={`timeLimit-${index}`}>
            <Input id={`timeLimit-${index}`} name="timeLimit" type="number" min={5} max={300} defaultValue={draft.timeLimit} />
          </Field>
          <Field label="Points" htmlFor={`points-${index}`}>
            <Input id={`points-${index}`} name="points" type="number" min={0} max={10000} step={50} defaultValue={draft.points} />
          </Field>
          <Field label="Catégorie" htmlFor={`category-${index}`}>
            <Input id={`category-${index}`} name="category" defaultValue={draft.category} />
          </Field>
        </div>
        <Field label="Compétences" htmlFor={`skills-${index}`}>
          <Input id={`skills-${index}`} name="skills" defaultValue={draft.skills.join(", ")} />
        </Field>
      </fieldset>
      {!added ? (
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={pending}>
            Ajouter au quiz
          </Button>
        </div>
      ) : (
        <ButtonLink href={`/quizzes/${quizId}`} variant="ghost" size="sm">
          Voir dans le quiz
        </ButtonLink>
      )}
    </form>
  );
}
