"use client";

import { useActionState, useState } from "react";
import { updateSettingsAction, type GameFormState } from "@/actions/game-form";
import { Field, Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LEADERBOARD_LABELS, LEADERBOARD_METHODS } from "@/lib/constants";

export type SettingsValues = {
  timerMode: string;
  maxMinutes: number | null;
  pauseAllowed: boolean;
  endOnTimeout: boolean;
  basePoints: number;
  timeBonusEnabled: boolean;
  timeBonusMax: number;
  noHintBonusEnabled: boolean;
  noHintBonus: number;
  streakBonusEnabled: boolean;
  streakBonus: number;
  hintPenaltyEnabled: boolean;
  wrongAnswerPenalty: number;
  timeoutPenalty: number;
  leaderboardEnabled: boolean;
  leaderboardMethod: string;
  showLiveRanking: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationsEnabled: boolean;
};

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-3 card-2 p-3 cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SettingsForm({ gameId, initial, backHref }: { gameId: string; initial: SettingsValues; backHref: string }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction.bind(null, gameId), { ok: true } as GameFormState);
  const [timerMode, setTimerMode] = useState(initial.timerMode);
  const err = (key: string) => (!state.ok ? state.fields?.[key] : undefined);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {!state.ok ? <Alert tone="danger">{state.error}</Alert> : state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <section className="card p-5 space-y-4" aria-labelledby="sec-timer">
        <h2 id="sec-timer" className="font-semibold">
          Chronomètre
        </h2>
        <p className="text-sm text-text-muted">Le temps est calculé côté serveur. Le navigateur n&apos;est jamais la source de vérité.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode" htmlFor="timerMode" error={err("timerMode")}>
            <Select id="timerMode" name="timerMode" value={timerMode} onChange={(e) => setTimerMode(e.target.value)}>
              <option value="NONE">Aucune limite</option>
              <option value="GLOBAL">Durée globale</option>
              <option value="PER_STEP">Durée par étape (temps recommandé de chaque étape)</option>
            </Select>
          </Field>
          <Field label="Durée maximale (min)" htmlFor="maxMinutes" error={err("maxMinutes")} hint={timerMode === "NONE" ? "Ignorée sans limite de temps." : "Ex. : 30, 45, 60, 90."}>
            <Input id="maxMinutes" name="maxMinutes" type="number" min={1} max={480} defaultValue={initial.maxMinutes ?? ""} disabled={timerMode === "NONE"} aria-invalid={Boolean(err("maxMinutes"))} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="pauseAllowed" label="Pause autorisée" hint="Le formateur peut mettre la session en pause." defaultChecked={initial.pauseAllowed} />
          <Toggle name="endOnTimeout" label="Fin automatique à l'expiration" hint="Sinon, les apprenants peuvent continuer avec une pénalité." defaultChecked={initial.endOnTimeout} />
        </div>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="sec-score">
        <h2 id="sec-score" className="font-semibold">
          Score
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Points de base par énigme réussie" htmlFor="basePoints" error={err("basePoints")} hint="Peut être ajusté étape par étape.">
            <Input id="basePoints" name="basePoints" type="number" min={0} max={10000} defaultValue={initial.basePoints} />
          </Field>
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Bonus</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Toggle name="timeBonusEnabled" label="Bonus temps restant" hint="Proportionnel au temps recommandé non consommé." defaultChecked={initial.timeBonusEnabled} />
            <Field label="Bonus temps max" htmlFor="timeBonusMax" error={err("timeBonusMax")}>
              <Input id="timeBonusMax" name="timeBonusMax" type="number" min={0} max={10000} defaultValue={initial.timeBonusMax} />
            </Field>
          </div>
          <div className="space-y-2">
            <Toggle name="noHintBonusEnabled" label="Bonus sans indice" hint="Énigme réussie sans demander d'indice." defaultChecked={initial.noHintBonusEnabled} />
            <Field label="Bonus sans indice" htmlFor="noHintBonus" error={err("noHintBonus")}>
              <Input id="noHintBonus" name="noHintBonus" type="number" min={0} max={10000} defaultValue={initial.noHintBonus} />
            </Field>
          </div>
          <div className="space-y-2">
            <Toggle name="streakBonusEnabled" label="Bonus série" hint="Réussites consécutives sans erreur." defaultChecked={initial.streakBonusEnabled} />
            <Field label="Bonus par étape en série" htmlFor="streakBonus" error={err("streakBonus")}>
              <Input id="streakBonus" name="streakBonus" type="number" min={0} max={10000} defaultValue={initial.streakBonus} />
            </Field>
          </div>
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Pénalités</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle name="hintPenaltyEnabled" label="Indices payants" hint="Applique le coût en points défini sur chaque indice." defaultChecked={initial.hintPenaltyEnabled} />
          <Field label="Pénalité par mauvaise réponse" htmlFor="wrongAnswerPenalty" error={err("wrongAnswerPenalty")} hint="0 = désactivée">
            <Input id="wrongAnswerPenalty" name="wrongAnswerPenalty" type="number" min={0} max={1000} defaultValue={initial.wrongAnswerPenalty} />
          </Field>
          <Field label="Pénalité temps dépassé" htmlFor="timeoutPenalty" error={err("timeoutPenalty")} hint="0 = désactivée">
            <Input id="timeoutPenalty" name="timeoutPenalty" type="number" min={0} max={10000} defaultValue={initial.timeoutPenalty} />
          </Field>
        </div>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="sec-rank">
        <h2 id="sec-rank" className="font-semibold">
          Classement
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle name="leaderboardEnabled" label="Classement activé" defaultChecked={initial.leaderboardEnabled} />
          <Toggle name="showLiveRanking" label="Classement visible pendant la session" hint="Sinon, uniquement à la fin." defaultChecked={initial.showLiveRanking} />
        </div>
        <Field label="Méthode de classement" htmlFor="leaderboardMethod" error={err("leaderboardMethod")} hint="Le mode pédagogique classe d'abord sur les étapes et compétences réussies, la vitesse ne départage qu'en dernier.">
          <Select id="leaderboardMethod" name="leaderboardMethod" defaultValue={initial.leaderboardMethod}>
            {LEADERBOARD_METHODS.map((m) => (
              <option key={m} value={m}>
                {LEADERBOARD_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="sec-immersion">
        <h2 id="sec-immersion" className="font-semibold">
          Immersion
        </h2>
        <p className="text-sm text-text-muted">Chaque apprenant peut désactiver ces éléments sur son appareil.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle name="animationsEnabled" label="Animations et transitions" defaultChecked={initial.animationsEnabled} />
          <Toggle name="soundEnabled" label="Effets sonores" hint="Réussite, erreur, déblocage." defaultChecked={initial.soundEnabled} />
          <Toggle name="musicEnabled" label="Musique d'ambiance" defaultChecked={initial.musicEnabled} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer les réglages"}
        </Button>
        <ButtonLink href={backHref} variant="ghost">
          Retour au jeu
        </ButtonLink>
      </div>
    </form>
  );
}
