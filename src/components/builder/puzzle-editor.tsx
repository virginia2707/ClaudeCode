"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { FileUpload } from "@/components/builder/file-upload";
import { Alert } from "@/components/ui/alert";
import { defaultConfigFor } from "@/lib/puzzles/registry";

type Cfg = Record<string, unknown>;
export type PuzzleEditorValue = { config: Cfg; answers: unknown[] };

const uid = () => Math.random().toString(36).slice(2, 8);

function AnswerList({ answers, onChange, placeholder, label }: { answers: string[]; onChange: (a: string[]) => void; placeholder: string; label: string }) {
  const id = useId();
  return (
    <div>
      <span className="label">{label}</span>
      <p className="-mt-1 mb-2 text-xs text-text-subtle">
        Plusieurs réponses peuvent être acceptées. La casse, les accents et les espaces superflus sont ignorés par défaut.
      </p>
      <ul className="space-y-2">
        {answers.map((a, i) => (
          <li key={i} className="flex gap-2">
            <label className="sr-only" htmlFor={`${id}-${i}`}>
              Réponse acceptée {i + 1}
            </label>
            <Input id={`${id}-${i}`} value={a} placeholder={placeholder} maxLength={300} onChange={(e) => onChange(answers.map((x, idx) => (idx === i ? e.target.value : x)))} />
            <Button variant="ghost" size="sm" onClick={() => onChange(answers.filter((_, idx) => idx !== i))} aria-label={`Supprimer la réponse ${i + 1}`} disabled={answers.length <= 1}>
              ×
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...answers, ""])} disabled={answers.length >= 20}>
        Ajouter une réponse acceptée
      </Button>
    </div>
  );
}

function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function PuzzleEditor({ type, value, onChange }: { type: string; value: PuzzleEditorValue; onChange: (v: PuzzleEditorValue) => void }) {
  const cfg = value.config as never;
  const setCfg = (patch: Cfg) => onChange({ ...value, config: { ...value.config, ...patch } });
  const setAnswers = (answers: unknown[]) => onChange({ ...value, answers });
  const strings = (value.answers.length ? value.answers : [""]).map((a) => (typeof a === "string" ? a : String(a ?? "")));

  switch (type) {
    case "NUMERIC_CODE": {
      const c = cfg as { tolerance?: number };
      return (
        <div className="space-y-4">
          <AnswerList answers={strings} onChange={setAnswers} label="Code(s) attendu(s)" placeholder="4832" />
          <div className="max-w-xs">
            <label className="label" htmlFor="pz-tolerance">
              Tolérance (±)
            </label>
            <Input id="pz-tolerance" type="number" min={0} max={1000} value={c.tolerance ?? 0} onChange={(e) => setCfg({ tolerance: Number(e.target.value) || 0 })} />
            <p className="mt-1 text-xs text-text-subtle">0 = réponse exacte. Utile pour un calcul arrondi.</p>
          </div>
        </div>
      );
    }
    case "SECRET_WORD":
      return <AnswerList answers={strings} onChange={setAnswers} label="Mot(s) accepté(s)" placeholder="AUTOMATISATION" />;
    case "SHORT_ANSWER":
      return <AnswerList answers={strings} onChange={setAnswers} label="Réponses acceptées" placeholder="Tableau croisé dynamique" />;
    case "SEQUENCE": {
      const c = cfg as { visible?: string[] };
      const visible = c.visible?.length ? c.visible : ["", "", ""];
      return (
        <div className="space-y-4">
          <div>
            <span className="label">Séquence affichée</span>
            <div className="flex flex-wrap gap-2">
              {visible.map((v, i) => (
                <span key={i} className="flex items-center gap-1">
                  <label className="sr-only" htmlFor={`seq-${i}`}>
                    Valeur {i + 1}
                  </label>
                  <Input id={`seq-${i}`} className="!w-24" value={v} maxLength={60} onChange={(e) => setCfg({ visible: visible.map((x, idx) => (idx === i ? e.target.value : x)) })} />
                </span>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setCfg({ visible: [...visible, ""] })} disabled={visible.length >= 12}>
                +
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCfg({ visible: visible.slice(0, -1) })} disabled={visible.length <= 2}>
                −
              </Button>
            </div>
            <p className="mt-1 text-xs text-text-subtle">Ex. : 2, 4, 8, 16 → l&apos;apprenant doit trouver 32.</p>
          </div>
          <AnswerList answers={strings} onChange={setAnswers} label="Valeur(s) suivante(s) attendue(s)" placeholder="32" />
        </div>
      );
    }
    case "TRUE_FALSE": {
      const current = value.answers[0] === true;
      return (
        <fieldset>
          <legend className="label">Réponse correcte</legend>
          <div className="flex gap-4">
            {[true, false].map((v) => (
              <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="tf-answer" checked={current === v} onChange={() => setAnswers([v])} className="h-4 w-4 accent-[var(--accent)]" />
                {v ? "Vrai" : "Faux"}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }
    case "MCQ": {
      const c = cfg as { choices?: { id: string; label: string }[]; multiple?: boolean; partialCredit?: boolean };
      const choices = c.choices?.length ? c.choices : [{ id: "a", label: "" }, { id: "b", label: "" }];
      const correct = new Set(Array.isArray(value.answers[0]) ? (value.answers[0] as string[]) : []);
      const toggle = (id: string) => {
        const next = new Set(correct);
        if (next.has(id)) next.delete(id);
        else {
          if (!c.multiple) next.clear();
          next.add(id);
        }
        setAnswers([[...next]]);
      };
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Check label="Plusieurs bonnes réponses" checked={Boolean(c.multiple)} onChange={(v) => { setCfg({ multiple: v }); if (!v && correct.size > 1) setAnswers([[...correct].slice(0, 1)]); }} />
            <Check label="Score partiel" checked={Boolean(c.partialCredit)} onChange={(v) => setCfg({ partialCredit: v })} hint="Crédite les bonnes réponses même si la sélection est incomplète." />
          </div>
          <div>
            <span className="label">Propositions (cochez la ou les bonnes réponses)</span>
            <ul className="space-y-2">
              {choices.map((ch, i) => (
                <li key={ch.id} className="flex items-center gap-2">
                  <input
                    type={c.multiple ? "checkbox" : "radio"}
                    name="mcq-correct"
                    checked={correct.has(ch.id)}
                    onChange={() => toggle(ch.id)}
                    className="h-4 w-4 accent-[var(--accent)] flex-none"
                    aria-label={`Proposition ${i + 1} correcte`}
                  />
                  <label className="sr-only" htmlFor={`mcq-${ch.id}`}>
                    Libellé de la proposition {i + 1}
                  </label>
                  <Input id={`mcq-${ch.id}`} value={ch.label} maxLength={300} placeholder={`Proposition ${i + 1}`} onChange={(e) => setCfg({ choices: choices.map((x) => (x.id === ch.id ? { ...x, label: e.target.value } : x)) })} />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={choices.length <= 2}
                    aria-label={`Supprimer la proposition ${i + 1}`}
                    onClick={() => {
                      setCfg({ choices: choices.filter((x) => x.id !== ch.id) });
                      if (correct.has(ch.id)) setAnswers([[...correct].filter((x) => x !== ch.id)]);
                    }}
                  >
                    ×
                  </Button>
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => setCfg({ choices: [...choices, { id: uid(), label: "" }] })} disabled={choices.length >= 10}>
              Ajouter une proposition
            </Button>
          </div>
        </div>
      );
    }
    case "MATCHING": {
      const c = cfg as { pairs?: { id: string; left: string; right: string }[]; partialCredit?: boolean };
      const pairs = c.pairs?.length ? c.pairs : [{ id: "p1", left: "", right: "" }, { id: "p2", left: "", right: "" }];
      const sync = (next: { id: string; left: string; right: string }[]) => onChange({ config: { ...value.config, pairs: next, partialCredit: c.partialCredit ?? true }, answers: [Object.fromEntries(next.map((p) => [p.id, p.id]))] });
      return (
        <div className="space-y-4">
          <Check label="Score partiel" checked={c.partialCredit ?? true} onChange={(v) => setCfg({ partialCredit: v })} hint="Crédite chaque association correcte." />
          <div>
            <span className="label">Associations attendues</span>
            <p className="-mt-1 mb-2 text-xs text-text-subtle">Les éléments de droite sont mélangés pour l&apos;apprenant.</p>
            <ul className="space-y-2">
              {pairs.map((p, i) => (
                <li key={p.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <label className="sr-only" htmlFor={`m-left-${p.id}`}>
                    Élément gauche {i + 1}
                  </label>
                  <Input id={`m-left-${p.id}`} value={p.left} maxLength={200} placeholder="SOMME" onChange={(e) => sync(pairs.map((x) => (x.id === p.id ? { ...x, left: e.target.value } : x)))} />
                  <span aria-hidden="true" className="text-text-subtle">
                    →
                  </span>
                  <label className="sr-only" htmlFor={`m-right-${p.id}`}>
                    Élément droit {i + 1}
                  </label>
                  <Input id={`m-right-${p.id}`} value={p.right} maxLength={200} placeholder="Additionne une plage" onChange={(e) => sync(pairs.map((x) => (x.id === p.id ? { ...x, right: e.target.value } : x)))} />
                  <Button variant="ghost" size="sm" disabled={pairs.length <= 2} aria-label={`Supprimer l'association ${i + 1}`} onClick={() => sync(pairs.filter((x) => x.id !== p.id))}>
                    ×
                  </Button>
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => sync([...pairs, { id: uid(), left: "", right: "" }])} disabled={pairs.length >= 10}>
              Ajouter une association
            </Button>
          </div>
        </div>
      );
    }
    case "ORDERING": {
      const c = cfg as { items?: { id: string; label: string }[]; partialCredit?: boolean };
      const items = c.items?.length ? c.items : [{ id: "i1", label: "" }, { id: "i2", label: "" }];
      const sync = (next: { id: string; label: string }[]) => onChange({ config: { ...value.config, items: next, partialCredit: c.partialCredit ?? true }, answers: [next.map((i) => i.id)] });
      const move = (i: number, d: number) => {
        const t = i + d;
        if (t < 0 || t >= items.length) return;
        const next = [...items];
        [next[i], next[t]] = [next[t], next[i]];
        sync(next);
      };
      return (
        <div className="space-y-4">
          <Check label="Score partiel" checked={c.partialCredit ?? true} onChange={(v) => setCfg({ partialCredit: v })} hint="Crédite chaque élément bien placé." />
          <div>
            <span className="label">Ordre correct (de haut en bas)</span>
            <p className="-mt-1 mb-2 text-xs text-text-subtle">Les éléments sont mélangés pour l&apos;apprenant.</p>
            <ol className="space-y-2">
              {items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-2">
                  <span className="rail-dot flex-none">{i + 1}</span>
                  <label className="sr-only" htmlFor={`ord-${it.id}`}>
                    Élément {i + 1}
                  </label>
                  <Input id={`ord-${it.id}`} value={it.label} maxLength={300} placeholder={`Étape ${i + 1} de la procédure`} onChange={(e) => sync(items.map((x) => (x.id === it.id ? { ...x, label: e.target.value } : x)))} />
                  <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Monter l'élément ${i + 1}`}>
                    ↑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Descendre l'élément ${i + 1}`}>
                    ↓
                  </Button>
                  <Button variant="ghost" size="sm" disabled={items.length <= 2} aria-label={`Supprimer l'élément ${i + 1}`} onClick={() => sync(items.filter((x) => x.id !== it.id))}>
                    ×
                  </Button>
                </li>
              ))}
            </ol>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => sync([...items, { id: uid(), label: "" }])} disabled={items.length >= 12}>
              Ajouter un élément
            </Button>
          </div>
        </div>
      );
    }
    case "IMAGE_HOTSPOT": {
      const c = cfg as { imageUrl?: string; hotspots?: { id: string; label: string; x: number; y: number; width: number; height: number }[] };
      const hotspots = c.hotspots?.length ? c.hotspots : [{ id: "h1", label: "", x: 40, y: 40, width: 20, height: 20 }];
      const sync = (next: typeof hotspots) => onChange({ config: { ...value.config, imageUrl: c.imageUrl ?? "", hotspots: next }, answers: next.map((h) => h.id) });
      return (
        <div className="space-y-4">
          <FileUpload
            name="__hotspotImage"
            label="Image"
            accept="image/png,image/jpeg,image/webp"
            defaultUrl={c.imageUrl ?? ""}
            preview="image"
            hint="L'apprenant devra cliquer une zone de cette image."
            onUploaded={(f) => setCfg({ imageUrl: f.url })}
          />
          <Alert tone="info">
            Les zones sont exprimées en pourcentage de l&apos;image (0 à 100), ce qui les rend indépendantes de la taille de l&apos;écran.
          </Alert>
          {c.imageUrl ? (
            <div className="relative inline-block max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.imageUrl} alt="Aperçu de l'image interactive" className="max-h-72 rounded border border-border" />
              {hotspots.map((h) => (
                <span key={h.id} className="absolute border-2 border-accent bg-accent-soft rounded" style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.width}%`, height: `${h.height}%` }} aria-hidden="true" />
              ))}
            </div>
          ) : null}
          <ul className="space-y-2">
            {hotspots.map((h, i) => (
              <li key={h.id} className="card-2 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Zone {i + 1}</span>
                  <Button variant="ghost" size="sm" disabled={hotspots.length <= 1} onClick={() => sync(hotspots.filter((x) => x.id !== h.id))} aria-label={`Supprimer la zone ${i + 1}`}>
                    ×
                  </Button>
                </div>
                <label className="sr-only" htmlFor={`hs-label-${h.id}`}>
                  Libellé de la zone {i + 1}
                </label>
                <Input id={`hs-label-${h.id}`} value={h.label} maxLength={200} placeholder="Ex. : Cellule F24" onChange={(e) => sync(hotspots.map((x) => (x.id === h.id ? { ...x, label: e.target.value } : x)))} />
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(["x", "y", "width", "height"] as const).map((k) => (
                    <div key={k}>
                      <label className="label" htmlFor={`hs-${k}-${h.id}`}>
                        {k === "x" ? "X %" : k === "y" ? "Y %" : k === "width" ? "Largeur %" : "Hauteur %"}
                      </label>
                      <Input id={`hs-${k}-${h.id}`} type="number" min={0} max={100} value={h[k]} onChange={(e) => sync(hotspots.map((x) => (x.id === h.id ? { ...x, [k]: Number(e.target.value) || 0 } : x)))} />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={() => sync([...hotspots, { id: uid(), label: "", x: 40, y: 40, width: 20, height: 20 }])} disabled={hotspots.length >= 10}>
            Ajouter une zone
          </Button>
        </div>
      );
    }
    case "FILE_ANALYSIS": {
      const c = cfg as { fileUrl?: string; fileName?: string; answerKind?: "text" | "number"; tolerance?: number };
      return (
        <div className="space-y-4">
          <FileUpload
            name="__analysisFile"
            label="Fichier à analyser"
            accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt"
            defaultUrl={c.fileUrl ?? ""}
            defaultFileName={c.fileName ?? ""}
            hint="Excel, CSV, PDF, Word ou image. L'apprenant pourra le télécharger."
            onUploaded={(f) => setCfg({ fileUrl: f.url, fileName: f.fileName })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="fa-kind">
                Type de réponse
              </label>
              <Select id="fa-kind" value={c.answerKind ?? "text"} onChange={(e) => setCfg({ answerKind: e.target.value })}>
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
              </Select>
            </div>
            {c.answerKind === "number" ? (
              <div>
                <label className="label" htmlFor="fa-tol">
                  Tolérance (±)
                </label>
                <Input id="fa-tol" type="number" min={0} max={1000} value={c.tolerance ?? 0} onChange={(e) => setCfg({ tolerance: Number(e.target.value) || 0 })} />
              </div>
            ) : null}
          </div>
          <AnswerList answers={strings} onChange={setAnswers} label="Réponses acceptées" placeholder="4832" />
        </div>
      );
    }
    default:
      return <Alert tone="warning">Type d&apos;énigme non reconnu : {type}.</Alert>;
  }
}

export function emptyValueFor(type: string): PuzzleEditorValue {
  const config = defaultConfigFor(type) as Cfg;
  switch (type) {
    case "TRUE_FALSE":
      return { config, answers: [true] };
    case "MCQ":
      return { config, answers: [[]] };
    case "MATCHING": {
      const pairs = (config.pairs as { id: string }[]) ?? [];
      return { config, answers: [Object.fromEntries(pairs.map((p) => [p.id, p.id]))] };
    }
    case "ORDERING": {
      const items = (config.items as { id: string }[]) ?? [];
      return { config, answers: [items.map((i) => i.id)] };
    }
    case "IMAGE_HOTSPOT": {
      const hs = (config.hotspots as { id: string }[]) ?? [];
      return { config, answers: hs.map((h) => h.id) };
    }
    default:
      return { config, answers: [""] };
  }
}
