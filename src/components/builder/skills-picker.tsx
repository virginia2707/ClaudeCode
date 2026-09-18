"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";

export function SkillsPicker({ selected, onChange, library }: { selected: string[]; onChange: (s: string[]) => void; library: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (name: string) => {
    const clean = name.trim().slice(0, 80);
    if (!clean || selected.includes(clean) || selected.length >= 10) return;
    onChange([...selected, clean]);
    setDraft("");
  };
  const suggestions = library.filter((s) => !selected.includes(s)).slice(0, 12);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 min-h-8" aria-live="polite">
        {selected.length === 0 ? <span className="text-sm text-warning">Aucune compétence : cette énigme ne comptera pas dans le bilan de compétences.</span> : null}
        {selected.map((s) => (
          <span key={s} className="pill pill-accent">
            {s}
            <button type="button" onClick={() => onChange(selected.filter((x) => x !== s))} aria-label={`Retirer la compétence ${s}`} className="ml-1 hover:text-danger">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <label className="sr-only" htmlFor="skill-draft">
          Ajouter une compétence
        </label>
        <Input
          id="skill-draft"
          value={draft}
          maxLength={80}
          placeholder="Ex. : Références absolues"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <Button variant="secondary" size="sm" onClick={() => add(draft)} disabled={!draft.trim() || selected.length >= 10}>
          Ajouter
        </Button>
      </div>
      {suggestions.length > 0 ? (
        <div className="mt-2">
          <span className="text-xs text-text-subtle">Depuis votre bibliothèque :</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="pill hover:border-accent hover:text-accent">
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Pill className="mt-2">Bibliothèque vide</Pill>
      )}
    </div>
  );
}
