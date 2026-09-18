"use client";

import { useState, useTransition } from "react";
import { launchSessionAction } from "@/actions/sessions";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function LaunchForm({ gameId, defaultMode, disabled }: { gameId: string; defaultMode: string; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState(defaultMode);

  const launch = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mode", mode);
      const r = await launchSessionAction(gameId, fd);
      if (r && !r.ok) setError(r.error);
    });
  };

  return (
    <div className="card p-5 space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="Mode de jeu" htmlFor="mode" hint="En équipe, les apprenants saisissent un nom d'équipe et partagent une progression.">
        <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} disabled={disabled}>
          <option value="INDIVIDUAL">Individuel</option>
          <option value="TEAM">En équipe</option>
        </Select>
      </Field>
      <Button size="lg" onClick={launch} disabled={disabled || pending}>
        {pending ? "Création de la session…" : "Lancer une session"}
      </Button>
    </div>
  );
}
