"use client";

import { useActionState } from "react";
import {
  addConstraintAction,
  deleteConstraintAction,
  setMissionSkillsAction,
  updateLearnerRoleAction,
  updateMissionBasicsAction,
  updateMissionSettingsAction,
  updateScenarioAction,
} from "@/actions/mission-editor-actions";
import { FormFeedback } from "@/components/auth/form-feedback";
import { SubmitButton } from "@/components/auth/submit-button";
import { ConfirmAction } from "@/components/trainer/confirm-action";
import { MissionBasicsFields } from "@/components/trainer/mission-form-fields";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { CONSTRAINT_OPERATORS, CONSTRAINT_TYPES, SCORING_MODES } from "@/lib/constants";

type MissionId = { missionId: string };

const CONSTRAINT_TYPE_LABELS: Record<(typeof CONSTRAINT_TYPES)[number], string> = {
  BUDGET: "Budget",
  TIME: "Temps",
  TEAM: "Équipe",
  TARGET: "Objectif",
  RISK: "Risque",
  CUSTOM: "Autre",
};
const OPERATOR_LABELS: Record<(typeof CONSTRAINT_OPERATORS)[number], string> = {
  MAX: "au maximum",
  MIN: "au minimum",
  EQ: "exactement",
};
const SCORING_LABELS: Record<(typeof SCORING_MODES)[number], string> = {
  SCORE_AND_SKILLS: "Score et compétences",
  SKILLS_ONLY: "Compétences uniquement (sans score ni classement)",
};

export function MissionBasicsForm({ missionId, mission }: MissionId & { mission: Parameters<typeof MissionBasicsFields>[0]["defaults"] }) {
  const [state, action] = useActionState(updateMissionBasicsAction, undefined);
  return (
    <form action={action} aria-label="Fiche de la mission" className="space-y-4" noValidate>
      <input type="hidden" name="missionId" value={missionId} />
      <FormFeedback state={state} />
      <MissionBasicsFields errors={state?.fieldErrors} values={undefined} prefix="edit-" defaults={mission} />
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer la fiche</SubmitButton>
    </form>
  );
}

export function MissionSettingsForm({
  missionId,
  objectives,
  expectedOutcome,
  scoringMode,
  coachEnabled,
}: MissionId & { objectives: string; expectedOutcome: string; scoringMode: string; coachEnabled: boolean }) {
  const [state, action] = useActionState(updateMissionSettingsAction, undefined);
  return (
    <form action={action} aria-label="Objectifs et réglages" className="space-y-4" noValidate>
      <input type="hidden" name="missionId" value={missionId} />
      <FormFeedback state={state} />
      <Field id="settings-objectives" label="Objectifs pédagogiques" hint="Un objectif par ligne. Douze au maximum." error={state?.fieldErrors?.objectives}>
        {(p) => <Textarea {...p} name="objectives" rows={4} defaultValue={objectives} placeholder={"Analyser des données de marché\nArbitrer sous contrainte de budget"} />}
      </Field>
      <Field id="settings-expectedOutcome" label="Résultat attendu" hint="Ce que l'apprenant doit avoir produit à la fin." error={state?.fieldErrors?.expectedOutcome}>
        {(p) => <Textarea {...p} name="expectedOutcome" rows={2} defaultValue={expectedOutcome} placeholder="Un plan de lancement à 30 jours finançable et argumenté." />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="settings-scoringMode" label="Évaluation" hint="Le mode « compétences uniquement » masque le score et le classement.">
          {(p) => (
            <Select {...p} name="scoringMode" defaultValue={scoringMode}>
              {SCORING_MODES.map((m) => (
                <option key={m} value={m}>
                  {SCORING_LABELS[m]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex items-end">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-elevated p-3">
            <input type="checkbox" name="coachEnabled" defaultChecked={coachEnabled} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
            <span>
              <span className="block text-sm font-medium">Coach IA activé</span>
              <span className="block text-xs text-text-secondary">Aide progressive en cinq niveaux, sans donner la solution.</span>
            </span>
          </label>
        </div>
      </div>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer les objectifs</SubmitButton>
    </form>
  );
}

export function ScenarioForm({
  missionId,
  scenario,
}: MissionId & {
  scenario: { companyName: string; setting: string; context: string; problem: string; stakes: string; timeframe: string; briefing: string; openingMessage: string } | null;
}) {
  const [state, action] = useActionState(updateScenarioAction, undefined);
  const v = (key: keyof NonNullable<typeof scenario>) => scenario?.[key] ?? "";
  return (
    <form action={action} aria-label="Briefing immersif" className="space-y-4" noValidate>
      <input type="hidden" name="missionId" value={missionId} />
      <FormFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="scenario-companyName" label="Entreprise" hint="Où l'apprenant travaille dans la fiction." error={state?.fieldErrors?.companyName}>
          {(p) => <Input {...p} name="companyName" placeholder="NovaTech" defaultValue={v("companyName")} />}
        </Field>
        <Field id="scenario-setting" label="Lieu / cadre" error={state?.fieldErrors?.setting}>
          {(p) => <Input {...p} name="setting" placeholder="Siège de NovaTech, lundi matin" defaultValue={v("setting")} />}
        </Field>
      </div>
      <Field id="scenario-context" label="Contexte" hint="La situation de départ, telle qu'un collègue la raconterait." error={state?.fieldErrors?.context}>
        {(p) => <Textarea {...p} name="context" rows={3} defaultValue={v("context")} />}
      </Field>
      <Field id="scenario-problem" label="Problème à résoudre" error={state?.fieldErrors?.problem}>
        {(p) => <Textarea {...p} name="problem" rows={2} placeholder="Budget limité, données clients incomplètes, équipe réduite." defaultValue={v("problem")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="scenario-stakes" label="Pourquoi agir maintenant" error={state?.fieldErrors?.stakes}>
          {(p) => <Textarea {...p} name="stakes" rows={2} placeholder="La direction attend une recommandation demain matin." defaultValue={v("stakes")} />}
        </Field>
        <Field id="scenario-timeframe" label="Délai (formulation narrative)" error={state?.fieldErrors?.timeframe}>
          {(p) => <Input {...p} name="timeframe" placeholder="48 heures" defaultValue={v("timeframe")} />}
        </Field>
      </div>
      <Field
        id="briefing"
        label="Briefing présenté à l'apprenant"
        hint="Répondez à : qui êtes-vous, où, quel problème, pourquoi agir, quel délai, quelles contraintes, quel résultat attendu."
        error={state?.fieldErrors?.briefing}
      >
        {(p) => (
          <Textarea
            {...p}
            name="briefing"
            rows={6}
            placeholder="Vous êtes responsable marketing de NovaTech. La direction vient de valider le lancement d'un nouveau logiciel B2B…"
            defaultValue={v("briefing")}
          />
        )}
      </Field>
      <Field id="scenario-openingMessage" label="Message d'accroche" hint="Facultatif : le mail ou le message qui déclenche la mission." error={state?.fieldErrors?.openingMessage}>
        {(p) => <Textarea {...p} name="openingMessage" rows={3} defaultValue={v("openingMessage")} />}
      </Field>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer le briefing</SubmitButton>
    </form>
  );
}

export function LearnerRoleForm({
  missionId,
  role,
}: MissionId & { role: { title: string; department: string; seniority: string; reportsTo: string; responsibilities: string } | null }) {
  const [state, action] = useActionState(updateLearnerRoleAction, undefined);
  const v = (key: keyof NonNullable<typeof role>) => role?.[key] ?? "";
  return (
    <form action={action} aria-label="Rôle de l'apprenant" className="space-y-4" noValidate>
      <input type="hidden" name="missionId" value={missionId} />
      <FormFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="role-title" label="Rôle attribué" hint="« Vous êtes… »" error={state?.fieldErrors?.title} required>
          {(p) => <Input {...p} name="roleTitle" placeholder="Responsable marketing" defaultValue={v("title")} />}
        </Field>
        <Field id="role-department" label="Service" error={state?.fieldErrors?.department}>
          {(p) => <Input {...p} name="department" placeholder="Marketing" defaultValue={v("department")} />}
        </Field>
        <Field id="role-seniority" label="Ancienneté / positionnement" error={state?.fieldErrors?.seniority}>
          {(p) => <Input {...p} name="seniority" placeholder="En poste depuis 3 mois" defaultValue={v("seniority")} />}
        </Field>
        <Field id="role-reportsTo" label="Rend compte à" error={state?.fieldErrors?.reportsTo}>
          {(p) => <Input {...p} name="reportsTo" placeholder="Direction générale" defaultValue={v("reportsTo")} />}
        </Field>
      </div>
      <Field id="role-responsibilities" label="Responsabilités" error={state?.fieldErrors?.responsibilities}>
        {(p) => <Textarea {...p} name="responsibilities" rows={3} defaultValue={v("responsibilities")} />}
      </Field>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer le rôle</SubmitButton>
    </form>
  );
}

export function ConstraintsEditor({
  missionId,
  constraints,
}: MissionId & { constraints: { id: string; key: string; label: string; type: string; operator: string; value: number | null; unit: string | null; description: string }[] }) {
  const [state, action] = useActionState(addConstraintAction, undefined);
  const numberFmt = new Intl.NumberFormat("fr-FR");
  return (
    <div className="space-y-5">
      {constraints.length > 0 && (
        <ul className="divide-y divide-border">
          {constraints.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.label}</p>
                  <Badge tone="signal">{CONSTRAINT_TYPE_LABELS[c.type as keyof typeof CONSTRAINT_TYPE_LABELS] ?? c.type}</Badge>
                  <code className="mono-num text-xs text-text-muted">{c.key}</code>
                </div>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {OPERATOR_LABELS[c.operator as keyof typeof OPERATOR_LABELS]}{" "}
                  <span className="mono-num font-semibold text-signal">
                    {c.value === null ? "—" : numberFmt.format(c.value)}
                    {c.unit ? ` ${c.unit}` : ""}
                  </span>
                  {c.description ? ` · ${c.description}` : ""}
                </p>
              </div>
              <ConfirmAction
                action={deleteConstraintAction}
                hiddenFields={{ missionId, constraintId: c.id }}
                label="Supprimer"
                confirmLabel="Supprimer"
                question="Confirmer ?"
              />
            </li>
          ))}
        </ul>
      )}

      <form action={action} aria-label="Ajouter une contrainte" className="space-y-4 border-t border-border pt-5" noValidate>
        <input type="hidden" name="missionId" value={missionId} />
        <FormFeedback state={state} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field id="constraint-label" label="Intitulé" error={state?.fieldErrors?.label} required>
            {(p) => <Input {...p} name="label" placeholder="Budget maximum" />}
          </Field>
          <Field id="constraint-type" label="Type" error={state?.fieldErrors?.type}>
            {(p) => (
              <Select {...p} name="type" defaultValue="BUDGET">
                {CONSTRAINT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CONSTRAINT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="constraint-operator" label="Comparaison" error={state?.fieldErrors?.operator}>
            {(p) => (
              <Select {...p} name="operator" defaultValue="MAX">
                {CONSTRAINT_OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {OPERATOR_LABELS[o]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="constraint-value" label="Valeur" error={state?.fieldErrors?.value} required>
            {(p) => <Input {...p} name="value" type="number" step="any" inputMode="decimal" placeholder="30000" />}
          </Field>
          <Field id="constraint-unit" label="Unité" error={state?.fieldErrors?.unit}>
            {(p) => <Input {...p} name="unit" placeholder="€" maxLength={16} />}
          </Field>
        </div>
        <Field id="constraint-description" label="Précision" hint="Facultative : ce que la contrainte implique pour l'apprenant." error={state?.fieldErrors?.description}>
          {(p) => <Input {...p} name="description" placeholder="Toute proposition au-delà devra être arbitrée." />}
        </Field>
        <SubmitButton pendingLabel="Ajout…">Ajouter la contrainte</SubmitButton>
      </form>
    </div>
  );
}

export function MissionSkillsForm({
  missionId,
  available,
  selectedIds,
}: MissionId & { available: { id: string; name: string; category: string | null; scope: "org" | "global" }[]; selectedIds: string[] }) {
  const [state, action] = useActionState(setMissionSkillsAction, undefined);
  const selected = new Set(selectedIds);
  return (
    <form action={action} aria-label="Compétences mobilisées" className="space-y-4" noValidate>
      <input type="hidden" name="missionId" value={missionId} />
      <FormFeedback state={state} />
      <fieldset>
        <legend className="label">Compétences mobilisées par cette mission</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {available.map((skill) => (
            <li key={skill.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-elevated p-3 hover:border-border-strong">
                <input type="checkbox" name="skillIds" value={skill.id} defaultChecked={selected.has(skill.id)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{skill.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                    {skill.category && <span>{skill.category}</span>}
                    {skill.scope === "global" && <Badge>bibliothèque</Badge>}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer les compétences</SubmitButton>
    </form>
  );
}
