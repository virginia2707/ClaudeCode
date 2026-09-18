"use client";

import { useActionState, useState } from "react";
import { createGameAction } from "@/actions/game";
import { idleState, type ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

type QuizOption = { id: string; title: string; questions: number; mode: "INDIVIDUAL" | "TEAM"; teams: string[] };

export function NewGameForm({ quizzes, preselected }: { quizzes: QuizOption[]; preselected?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createGameAction, idleState);
  const initial = quizzes.find((q) => q.id === preselected) ?? quizzes[0];
  const [quizId, setQuizId] = useState(initial.id);
  const [mode, setMode] = useState<"INDIVIDUAL" | "TEAM">(initial.mode);
  const quiz = quizzes.find((q) => q.id === quizId) ?? initial;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Quiz" htmlFor="quizId">
        <Select
          id="quizId"
          name="quizId"
          value={quizId}
          onChange={(e) => {
            const q = quizzes.find((x) => x.id === e.target.value);
            setQuizId(e.target.value);
            if (q) setMode(q.mode);
          }}
        >
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title} — {q.questions} question{q.questions > 1 ? "s" : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Mode de jeu" htmlFor="mode" hint={mode === "TEAM" ? `Équipes : ${quiz.teams.join(", ")} (modifiables dans les réglages du quiz)` : "Chaque apprenant joue pour lui-même."}>
        <Select id="mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value as "INDIVIDUAL" | "TEAM")}>
          <option value="INDIVIDUAL">Individuel</option>
          <option value="TEAM">Équipe</option>
        </Select>
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="spark" size="lg" loading={pending}>
          Créer la partie et obtenir le code
        </Button>
      </div>
    </form>
  );
}
