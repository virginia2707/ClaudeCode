"use client";

import { useId, useMemo } from "react";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Saisie de la réponse par l'apprenant, par type d'énigme.
 * Aucun élément ne connaît la bonne réponse : la validation est exclusivement
 * serveur. Ces composants ne produisent qu'une « soumission ».
 */
export type Submission = unknown;

type Props = {
  type: string;
  config: Record<string, unknown>;
  value: Submission;
  onChange: (v: Submission) => void;
  disabled?: boolean;
  /** Mélange déterministe par étape pour ne pas dévoiler l'ordre correct. */
  seed?: string;
};

function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function PuzzleInput({ type, config, value, onChange, disabled = false, seed = "" }: Props) {
  const id = useId();

  const choices = (config.choices as { id: string; label: string }[]) ?? [];
  const pairs = useMemo(() => (config.pairs as { id: string; left: string; right: string }[]) ?? [], [config.pairs]);
  const items = useMemo(() => (config.items as { id: string; label: string }[]) ?? [], [config.items]);
  const shuffledRights = useMemo(() => shuffle(pairs, seed + "r"), [pairs, seed]);
  const shuffledItems = useMemo(() => shuffle(items, seed + "i"), [items, seed]);

  switch (type) {
    case "NUMERIC_CODE":
      return (
        <div>
          <label htmlFor={id} className="label">
            Votre code
          </label>
          <input
            id={id}
            className="input input-code"
            inputMode="numeric"
            autoComplete="off"
            maxLength={20}
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "SECRET_WORD":
      return (
        <div>
          <label htmlFor={id} className="label">
            Mot secret
          </label>
          <input
            id={id}
            className="input input-code !text-lg !tracking-[0.2em]"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={60}
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "SHORT_ANSWER":
    case "SEQUENCE":
    case "FILE_ANALYSIS":
      return (
        <div>
          <label htmlFor={id} className="label">
            Votre réponse
          </label>
          <Input
            id={id}
            autoComplete="off"
            maxLength={(config.maxLength as number) ?? 300}
            inputMode={type === "FILE_ANALYSIS" && config.answerKind === "number" ? "decimal" : undefined}
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "TRUE_FALSE":
      return (
        <fieldset disabled={disabled}>
          <legend className="label">Votre réponse</legend>
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((v) => (
              <label
                key={String(v)}
                className={cn("card-2 p-4 text-center cursor-pointer font-medium", value === v && "border-accent text-accent bg-accent-soft")}
              >
                <input type="radio" name={`${id}-tf`} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
                {v ? "Vrai" : "Faux"}
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "MCQ": {
      const multiple = Boolean(config.multiple);
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      const toggle = (cid: string) => {
        const next = new Set(selected);
        if (next.has(cid)) next.delete(cid);
        else {
          if (!multiple) next.clear();
          next.add(cid);
        }
        onChange([...next]);
      };
      return (
        <fieldset disabled={disabled}>
          <legend className="label">{multiple ? "Plusieurs réponses possibles" : "Une seule réponse"}</legend>
          <ul className="space-y-2">
            {choices.map((c) => (
              <li key={c.id}>
                <label className={cn("card-2 p-3 flex items-start gap-3 cursor-pointer", selected.has(c.id) && "border-accent bg-accent-soft")}>
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name={`${id}-mcq`}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="text-sm">{c.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      );
    }
    case "MATCHING": {
      const mapping = (value && typeof value === "object" ? (value as Record<string, string>) : {}) ?? {};
      return (
        <fieldset disabled={disabled}>
          <legend className="label">Associez chaque élément</legend>
          <ul className="space-y-2">
            {pairs.map((p) => (
              <li key={p.id} className="card-2 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="flex-1 text-sm font-medium">{p.left}</span>
                <span aria-hidden="true" className="text-text-subtle hidden sm:inline">
                  →
                </span>
                <label className="sr-only" htmlFor={`${id}-${p.id}`}>
                  Correspondance pour {p.left}
                </label>
                <select
                  id={`${id}-${p.id}`}
                  className="input sm:w-1/2"
                  value={mapping[p.id] ?? ""}
                  onChange={(e) => onChange({ ...mapping, [p.id]: e.target.value })}
                >
                  <option value="">— choisir —</option>
                  {shuffledRights.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.right}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </fieldset>
      );
    }
    case "ORDERING": {
      const current: string[] = Array.isArray(value) && value.length === shuffledItems.length ? (value as string[]) : shuffledItems.map((i) => i.id);
      const labelFor = (iid: string) => items.find((i) => i.id === iid)?.label ?? "";
      const move = (index: number, delta: number) => {
        const target = index + delta;
        if (target < 0 || target >= current.length) return;
        const next = [...current];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
      };
      return (
        <div>
          <span className="label">Remettez dans le bon ordre</span>
          <ol className="space-y-2">
            {current.map((iid, i) => (
              <li key={iid} className="card-2 p-3 flex items-center gap-2">
                <span className="rail-dot flex-none">{i + 1}</span>
                <span className="flex-1 text-sm">{labelFor(iid)}</span>
                <Button variant="ghost" size="sm" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Monter ${labelFor(iid)}`}>
                  ↑
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled || i === current.length - 1} onClick={() => move(i, 1)} aria-label={`Descendre ${labelFor(iid)}`}>
                  ↓
                </Button>
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case "IMAGE_HOTSPOT": {
      const imageUrl = (config.imageUrl as string) ?? "";
      const point = value && typeof value === "object" ? (value as { x: number; y: number }) : null;
      const pick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onChange({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
      };
      return (
        <div>
          <span className="label">Cliquez la bonne zone de l&apos;image</span>
          <button type="button" onClick={pick} disabled={disabled} className="relative block w-full rounded border border-border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Image de l'énigme : cliquez la zone correspondante" className="w-full" />
            {point ? (
              <span
                className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent-soft"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                aria-hidden="true"
              />
            ) : null}
          </button>
          <p className="mt-1.5 text-xs text-text-subtle" aria-live="polite">
            {point ? `Zone sélectionnée (${Math.round(point.x)} %, ${Math.round(point.y)} %).` : "Aucune zone sélectionnée."}
          </p>
        </div>
      );
    }
    default:
      return <p className="text-sm text-danger">Type d&apos;énigme non pris en charge.</p>;
  }
}

/** Valeur initiale d'une soumission vide, par type. */
export function emptySubmission(type: string): Submission {
  switch (type) {
    case "MCQ":
      return [];
    case "TRUE_FALSE":
      return null;
    case "MATCHING":
      return {};
    case "ORDERING":
      return [];
    case "IMAGE_HOTSPOT":
      return null;
    default:
      return "";
  }
}

/** Une soumission est-elle exploitable (non vide) ? */
export function hasSubmission(type: string, value: Submission) {
  switch (type) {
    case "MCQ":
      return Array.isArray(value) && value.length > 0;
    case "TRUE_FALSE":
      return typeof value === "boolean";
    case "MATCHING":
      return Boolean(value) && Object.values(value as Record<string, string>).some((v) => v);
    case "ORDERING":
      return Array.isArray(value) && value.length > 0;
    case "IMAGE_HOTSPOT":
      return Boolean(value);
    default:
      return typeof value === "string" && value.trim().length > 0;
  }
}

/** Mélange déterministe exposé pour la prévisualisation. */
export { shuffle as deterministicShuffle };
