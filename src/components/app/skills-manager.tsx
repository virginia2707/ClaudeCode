"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSkillAction, deleteSkillAction, type SkillFormState } from "@/actions/skills";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/app/empty-state";
import { IconTarget } from "@/components/ui/icons";

type Skill = { id: string; name: string; description: string; category: string | null; usage: number };

export function SkillsManager({ skills }: { skills: Skill[] }) {
  const [state, action, pending] = useActionState(createSkillAction, { ok: true } as SkillFormState);
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const onDelete = (s: Skill) => {
    if (!window.confirm(`Supprimer la compétence « ${s.name} » ?`)) return;
    startDelete(async () => {
      const r = await deleteSkillAction(s.id);
      setDeleteMsg(r.ok ? null : r.error);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <form action={action} className="card p-5 space-y-4 self-start" noValidate>
        <h2 className="font-semibold">Ajouter une compétence</h2>
        {!state.ok ? <Alert tone="danger">{state.error}</Alert> : state.message ? <Alert tone="success">{state.message}</Alert> : null}
        <Field label="Nom" htmlFor="name" required error={!state.ok ? state.fields?.name : undefined}>
          <Input id="name" name="name" required maxLength={80} placeholder="Ex. : Références absolues" key={state.ok && state.message ? "reset" : "keep"} defaultValue={!state.ok ? state.values?.name : ""} />
        </Field>
        <Field label="Catégorie" htmlFor="category" hint="Facultatif, pour regrouper (ex. : Excel, Management).">
          <Input id="category" name="category" maxLength={60} defaultValue={!state.ok ? state.values?.category : ""} />
        </Field>
        <Field label="Description" htmlFor="description">
          <Input id="description" name="description" maxLength={500} defaultValue={!state.ok ? state.values?.description : ""} />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
      </form>
      <div>
        {deleteMsg ? <Alert tone="danger" className="mb-3">{deleteMsg}</Alert> : null}
        {skills.length === 0 ? (
          <EmptyState icon={<IconTarget size={22} />} title="Aucune compétence" description="Chaque énigme peut être reliée à une ou plusieurs compétences. Elles alimentent le rapport final et les statistiques." />
        ) : (
          <ul className="card divide-y divide-border">
            {skills.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-text-muted">
                    {s.category ? `${s.category} · ` : ""}
                    {s.usage} énigme{s.usage > 1 ? "s" : ""}
                    {s.description ? ` · ${s.description}` : ""}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDelete(s)} disabled={deleting || s.usage > 0} title={s.usage > 0 ? "Utilisée par des énigmes" : undefined}>
                  Supprimer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
