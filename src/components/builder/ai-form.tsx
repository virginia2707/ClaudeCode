"use client";

import { useActionState } from "react";
import { generateGameAction, type AIFormState } from "@/actions/ai";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { LEVELS, LEVEL_LABELS } from "@/lib/constants";
import { IconSparkles } from "@/components/ui/icons";

export function AIGenerateForm({ providerName }: { providerName: string }) {
  const [state, action, pending] = useActionState(generateGameAction, { ok: true } as AIFormState);
  const err = (k: string) => (!state.ok ? state.fields?.[k] : undefined);
  const v = (k: string, fallback = "") => state.values?.[k] ?? fallback;

  return (
    <form action={action} className="space-y-6" noValidate>
      {!state.ok ? <Alert tone="danger">{state.error}</Alert> : null}

      <section className="card p-5 space-y-4">
        <Field label="Sujet de la formation" htmlFor="subject" required error={err("subject")} hint="Ex. : Excel, accueil client, prévention des risques, RGPD.">
          <Input id="subject" name="subject" required maxLength={200} defaultValue={v("subject")} placeholder="Excel" aria-invalid={Boolean(err("subject"))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Niveau" htmlFor="level" error={err("level")}>
            <Select id="level" name="level" defaultValue={v("level", "INTERMEDIATE")}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Durée (minutes)" htmlFor="durationMinutes" error={err("durationMinutes")}>
            <Input id="durationMinutes" name="durationMinutes" type="number" min={10} max={240} defaultValue={v("durationMinutes", "45")} />
          </Field>
          <Field label="Nombre d'étapes" htmlFor="stepCount" error={err("stepCount")}>
            <Input id="stepCount" name="stepCount" type="number" min={2} max={10} defaultValue={v("stepCount", "5")} />
          </Field>
        </div>
        <Field label="Objectifs et compétences" htmlFor="objectives" error={err("objectives")} hint="Séparés par des virgules. Ex. : formules, recherche de données, tableaux croisés dynamiques.">
          <Textarea id="objectives" name="objectives" rows={3} maxLength={600} defaultValue={v("objectives")} />
        </Field>
        <Field label="Public" htmlFor="audience" error={err("audience")} hint="Facultatif. Ex. : assistants de gestion en reconversion.">
          <Input id="audience" name="audience" maxLength={200} defaultValue={v("audience")} />
        </Field>
      </section>

      <Alert tone="info">
        L&apos;IA produit une <strong>proposition</strong> enregistrée en brouillon. Rien n&apos;est publié : vous relisez, modifiez,
        prévisualisez, puis publiez vous-même. Fournisseur actuel : <span className="font-mono">{providerName}</span>.
      </Alert>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          <IconSparkles size={18} /> {pending ? "Génération en cours…" : "Générer le brouillon"}
        </Button>
        <ButtonLink href="/app/games" variant="ghost">
          Annuler
        </ButtonLink>
      </div>
    </form>
  );
}
