"use client";

import { useActionState, useState } from "react";
import { updateQuizSettingsAction } from "@/actions/quiz";
import { idleState, type ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { JOKER_LABELS, JOKER_TYPES } from "@/lib/constants";
import type { QuizSettings } from "@/lib/validation/quiz";

export function QuizSettingsForm({ quizId, settings }: { quizId: string; settings: QuizSettings }) {
  const bound = updateQuizSettingsAction.bind(null, quizId);
  const [state, action, pending] = useActionState<ActionState, FormData>(bound, idleState);
  const [speedWeight, setSpeedWeight] = useState(settings.speedWeight);
  const [mode, setMode] = useState(settings.mode);

  return (
    <form action={action} className="space-y-8" noValidate>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">Réglages enregistrés.</Alert> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Temps et points</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Temps par question (s)" htmlFor="timePerQuestion" hint="Valeur par défaut pour les nouvelles questions.">
            <Input id="timePerQuestion" name="timePerQuestion" type="number" min={5} max={300} defaultValue={settings.timePerQuestion} />
          </Field>
          <Field label="Points par bonne réponse" htmlFor="basePoints">
            <Input id="basePoints" name="basePoints" type="number" min={0} max={10000} step={50} defaultValue={settings.basePoints} />
          </Field>
          <Field label="Bonus de rapidité max" htmlFor="maxSpeedBonus">
            <Input id="maxSpeedBonus" name="maxSpeedBonus" type="number" min={0} max={10000} step={50} defaultValue={settings.maxSpeedBonus} />
          </Field>
        </div>
        <div className="card-2 p-4">
          <label htmlFor="speedWeight" className="label">
            Poids de la rapidité : <span className="text-text">{Math.round(speedWeight * 100)} %</span>
          </label>
          <input
            id="speedWeight"
            name="speedWeight"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={speedWeight}
            onChange={(e) => setSpeedWeight(Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
            aria-valuetext={`${Math.round(speedWeight * 100)} %`}
          />
          <p className="mt-2 text-xs text-text-muted">
            0 % : seule l&apos;exactitude compte. 100 % : bonus de rapidité complet. Une valeur intermédiaire privilégie la réflexion tout en gardant du rythme.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pénalité mauvaise réponse (points)" htmlFor="wrongAnswerPenalty" hint="0 par défaut : aucun point n'est retiré.">
            <Input id="wrongAnswerPenalty" name="wrongAnswerPenalty" type="number" min={0} max={10000} step={50} defaultValue={settings.wrongAnswerPenalty} />
          </Field>
          <Field label="Bonus de série" htmlFor="streakBonuses" hint="Pour 1, 2, 3, 4, 5+ bonnes réponses d'affilée, séparés par des virgules.">
            <Input id="streakBonuses" name="streakBonuses" defaultValue={settings.streakBonuses.join(", ")} />
          </Field>
        </div>
        <Switch id="streakEnabled" name="streakEnabled" label="Activer les séries" description="Une mauvaise réponse réinitialise la série." defaultChecked={settings.streakEnabled} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Feedback et affichage</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Switch id="feedbackEnabled" name="feedbackEnabled" label="Feedback après chaque question" description="Points gagnés, bonus et bonne réponse." defaultChecked={settings.feedbackEnabled} />
          <Switch id="showExplanation" name="showExplanation" label="Afficher l'explication pédagogique" defaultChecked={settings.showExplanation} />
          <Switch id="showLeaderboard" name="showLeaderboard" label="Classement entre les questions" defaultChecked={settings.showLeaderboard} />
          <Switch id="showAnswerDistribution" name="showAnswerDistribution" label="Répartition des réponses (écran formateur)" defaultChecked={settings.showAnswerDistribution} />
          <Switch id="shuffleAnswers" name="shuffleAnswers" label="Mélanger l'ordre des réponses" defaultChecked={settings.shuffleAnswers} />
          <Switch id="soundsEnabled" name="soundsEnabled" label="Sons" description="Bips discrets sur le timer (facultatif)." defaultChecked={settings.soundsEnabled} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Jokers</h2>
        <Switch id="jokersEnabled" name="jokersEnabled" label="Activer les jokers" description="Chaque joueur reçoit le stock ci-dessous en début de partie." defaultChecked={settings.jokersEnabled} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {JOKER_TYPES.map((type) => (
            <Field key={type} label={JOKER_LABELS[type].name} htmlFor={`joker_${type}`} hint={JOKER_LABELS[type].description}>
              <Input id={`joker_${type}`} name={`joker_${type}`} type="number" min={0} max={5} defaultValue={settings.jokers[type]} />
            </Field>
          ))}
        </div>
        <Field label="Durée du joker Extra Time (s)" htmlFor="extraTimeSeconds" className="sm:max-w-xs">
          <Input id="extraTimeSeconds" name="extraTimeSeconds" type="number" min={1} max={60} defaultValue={settings.extraTimeSeconds} />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mode de jeu</h2>
        <Field label="Mode" htmlFor="mode" className="sm:max-w-xs">
          <Select id="mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value as QuizSettings["mode"])}>
            <option value="INDIVIDUAL">Individuel</option>
            <option value="TEAM">Équipe</option>
          </Select>
        </Field>
        {mode === "TEAM" ? (
          <Field label="Équipes" htmlFor="teamNames" hint="Une équipe par ligne. Les points des joueurs s'additionnent.">
            <Textarea id="teamNames" name="teamNames" defaultValue={settings.teamNames.join("\n")} />
          </Field>
        ) : (
          <input type="hidden" name="teamNames" value={settings.teamNames.join("\n")} />
        )}
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          Enregistrer les réglages
        </Button>
      </div>
    </form>
  );
}
