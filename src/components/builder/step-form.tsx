"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveStepAction, type StepFormState } from "@/actions/steps";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FileUpload } from "@/components/builder/file-upload";
import { HintsEditor, type HintDraft } from "@/components/builder/hints-editor";
import { SkillsPicker } from "@/components/builder/skills-picker";
import { PuzzleEditor, emptyValueFor, type PuzzleEditorValue } from "@/components/builder/puzzle-editor";
import { puzzleCatalog } from "@/lib/puzzles/registry";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/constants";

export type StepFormValues = {
  title: string;
  description: string;
  instruction: string;
  content: string;
  imageUrl: string;
  fileUrl: string;
  fileName: string;
  videoUrl: string;
  unlockCode: string;
  points: number;
  recommendedSeconds: number;
  difficulty: string;
  isFinal: boolean;
  successFeedback: string;
  errorFeedback: string;
  explanation: string;
  puzzleType: string;
  prompt: string;
  validationMode: string;
  maxAttempts: number | null;
  caseSensitive: boolean;
  accentSensitive: boolean;
  config: Record<string, unknown>;
  answers: unknown[];
  hints: HintDraft[];
  skills: string[];
};

export function StepForm({
  stepId,
  gameId,
  stepIndex,
  initial,
  skillLibrary,
  hintPenaltyEnabled,
}: {
  stepId: string;
  gameId: string;
  stepIndex: number;
  initial: StepFormValues;
  skillLibrary: string[];
  hintPenaltyEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveStepAction.bind(null, stepId), { ok: true } as StepFormState);
  const [puzzleType, setPuzzleType] = useState(initial.puzzleType);
  const [puzzle, setPuzzle] = useState<PuzzleEditorValue>({ config: initial.config, answers: initial.answers });
  const [hints, setHints] = useState<HintDraft[]>(initial.hints);
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const err = (key: string) => (!state.ok ? state.fields?.[key] : undefined);
  const selected = puzzleCatalog.find((p) => p.type === puzzleType);

  const changeType = (type: string) => {
    setPuzzleType(type);
    setPuzzle(emptyValueFor(type));
  };

  return (
    <form action={action} className="space-y-6" noValidate>
      {!state.ok ? <Alert tone="danger">{state.error}</Alert> : state.message ? <Alert tone="success">{state.message}</Alert> : null}

      {/* Champs sérialisés gérés par les sous-éditeurs */}
      <input type="hidden" name="config" value={JSON.stringify(puzzle.config)} />
      <input type="hidden" name="answers" value={JSON.stringify(puzzle.answers)} />
      <input type="hidden" name="hints" value={JSON.stringify(hints)} />
      <input type="hidden" name="skills" value={JSON.stringify(skills)} />
      <input type="hidden" name="puzzleType" value={puzzleType} />

      <section className="card p-5 space-y-4" aria-labelledby="st-content">
        <h2 id="st-content" className="font-semibold">
          Étape {stepIndex + 1} — contenu
        </h2>
        <Field label="Titre de l'étape" htmlFor="title" required error={err("title")} hint="Ex. : Le fichier mystérieux">
          <Input id="title" name="title" required maxLength={120} defaultValue={initial.title} aria-invalid={Boolean(err("title"))} />
        </Field>
        <Field label="Consigne" htmlFor="instruction" error={err("instruction")} hint="Ce que l'apprenant doit faire. Doit être compréhensible sans contexte supplémentaire.">
          <Textarea id="instruction" name="instruction" rows={3} maxLength={2000} defaultValue={initial.instruction} />
        </Field>
        <Field label="Contenu / données" htmlFor="content" error={err("content")} hint="Texte, tableau de valeurs, extrait de document… Affiché avec l'énigme. Facultatif.">
          <Textarea id="content" name="content" rows={4} maxLength={5000} defaultValue={initial.content} />
        </Field>
        <Field label="Description interne" htmlFor="description" error={err("description")} hint="Note pour vous, non affichée aux apprenants.">
          <Input id="description" name="description" maxLength={1000} defaultValue={initial.description} />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <FileUpload name="imageUrl" label="Image" accept="image/png,image/jpeg,image/webp,image/gif" defaultUrl={initial.imageUrl} preview="image" hint="Illustration affichée avec l'étape." />
          <FileUpload name="fileUrl" fileNameField="fileName" label="Fichier joint" accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" defaultUrl={initial.fileUrl} defaultFileName={initial.fileName} hint="Document que l'apprenant peut télécharger." />
        </div>
        <Field label="Vidéo (URL)" htmlFor="videoUrl" error={err("videoUrl")} hint="Lien https vers une vidéo. Facultatif.">
          <Input id="videoUrl" name="videoUrl" type="url" maxLength={500} defaultValue={initial.videoUrl} placeholder="https://…" />
        </Field>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="st-puzzle">
        <h2 id="st-puzzle" className="font-semibold">
          Énigme
        </h2>
        <Field label="Type d'énigme" htmlFor="puzzleTypeSelect" error={err("puzzleType")} hint={selected?.description}>
          <Select id="puzzleTypeSelect" value={puzzleType} onChange={(e) => changeType(e.target.value)}>
            {puzzleCatalog.map((p) => (
              <option key={p.type} value={p.type}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Énoncé de l'énigme" htmlFor="prompt" error={err("prompt")} hint="La question posée. Ex. : « Quel est le total affiché dans la cellule F24 ? »">
          <Textarea id="prompt" name="prompt" rows={2} maxLength={2000} defaultValue={initial.prompt} />
        </Field>
        <div className="divider" />
        <PuzzleEditor type={puzzleType} value={puzzle} onChange={setPuzzle} />
        <div className="divider" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode de validation" htmlFor="validationMode" error={err("validationMode")} hint="Manuelle : le formateur valide depuis l'écran live.">
            <Select id="validationMode" name="validationMode" defaultValue={initial.validationMode}>
              <option value="AUTO">Automatique</option>
              <option value="MANUAL">Manuelle (par le formateur)</option>
            </Select>
          </Field>
          <Field label="Tentatives maximum" htmlFor="maxAttempts" error={err("maxAttempts")} hint="Vide ou 0 = illimité.">
            <Input id="maxAttempts" name="maxAttempts" type="number" min={0} max={100} defaultValue={initial.maxAttempts ?? ""} />
          </Field>
        </div>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="label">Comparaison des réponses</legend>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" name="caseSensitive" defaultChecked={initial.caseSensitive} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span>
              Sensible à la casse
              <span className="block text-xs text-text-muted">Par défaut, « excel » et « EXCEL » sont équivalents.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" name="accentSensitive" defaultChecked={initial.accentSensitive} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span>
              Sensible aux accents
              <span className="block text-xs text-text-muted">Par défaut, « référence » et « reference » sont équivalents.</span>
            </span>
          </label>
        </fieldset>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="st-hints">
        <h2 id="st-hints" className="font-semibold">
          Indices
        </h2>
        <HintsEditor hints={hints} onChange={setHints} hintPenaltyEnabled={hintPenaltyEnabled} />
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="st-peda">
        <h2 id="st-peda" className="font-semibold">
          Pédagogie et récompense
        </h2>
        <div>
          <span className="label">Compétences travaillées</span>
          <SkillsPicker selected={skills} onChange={setSkills} library={skillLibrary} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Points" htmlFor="points" error={err("points")}>
            <Input id="points" name="points" type="number" min={0} max={10000} defaultValue={initial.points} aria-invalid={Boolean(err("points"))} />
          </Field>
          <Field label="Temps recommandé (secondes)" htmlFor="recommendedSeconds" error={err("recommendedSeconds")}>
            <Input id="recommendedSeconds" name="recommendedSeconds" type="number" min={0} max={7200} defaultValue={initial.recommendedSeconds} aria-invalid={Boolean(err("recommendedSeconds"))} />
          </Field>
          <Field label="Difficulté" htmlFor="difficulty" error={err("difficulty")}>
            <Select id="difficulty" name="difficulty" defaultValue={initial.difficulty}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Code obtenu en réussissant" htmlFor="unlockCode" error={err("unlockCode")} hint="Affiché à l'apprenant comme récompense. Ex. : 4729 ou EXCEL. Facultatif.">
          <Input id="unlockCode" name="unlockCode" maxLength={40} defaultValue={initial.unlockCode} className="font-mono" />
        </Field>
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" name="isFinal" defaultChecked={initial.isFinal} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>
            Mission finale
            <span className="block text-xs text-text-muted">Réussir cette étape termine la mission. Une seule étape finale par jeu.</span>
          </span>
        </label>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="st-feedback">
        <h2 id="st-feedback" className="font-semibold">
          Feedback
        </h2>
        <Field label="Feedback de réussite" htmlFor="successFeedback" error={err("successFeedback")} hint="Ex. : « Bonne réponse. Vous avez identifié la formule correcte. »">
          <Textarea id="successFeedback" name="successFeedback" rows={2} maxLength={1000} defaultValue={initial.successFeedback} />
        </Field>
        <Field label="Feedback d'erreur" htmlFor="errorFeedback" error={err("errorFeedback")} hint="Ex. : « Ce n'est pas la bonne réponse. Relisez les données du tableau. »">
          <Textarea id="errorFeedback" name="errorFeedback" rows={2} maxLength={1000} defaultValue={initial.errorFeedback} />
        </Field>
        <Field label="Explication pédagogique" htmlFor="explanation" error={err("explanation")} hint="Affichée après la réussite pour ancrer l'apprentissage.">
          <Textarea id="explanation" name="explanation" rows={3} maxLength={2000} defaultValue={initial.explanation} />
        </Field>
      </section>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-bg/90 backdrop-blur py-3 -mx-1 px-1 border-t border-border">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer l'étape"}
        </Button>
        <Link href={`/app/games/${gameId}/steps`} className="btn btn-ghost">
          Retour aux étapes
        </Link>
        <Link href={`/app/games/${gameId}/preview?step=${stepIndex}`} className="btn btn-secondary">
          Prévisualiser
        </Link>
      </div>
    </form>
  );
}
