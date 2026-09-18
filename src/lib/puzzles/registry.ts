import { z } from "zod";
import type { PuzzleDefinition, PuzzleType, ValidationOptions, ValidationResult } from "@/lib/puzzles/types";
import { PUZZLE_TYPES } from "@/lib/puzzles/types";
import { normalizeCode, normalizeNumber, normalizeText } from "@/lib/puzzles/normalize";

/* ------------------------------------------------------------------ helpers */

const correct = (ratio = 1, detail?: string): ValidationResult => ({ correct: true, ratio, detail });
const wrong = (ratio = 0, detail?: string): ValidationResult => ({ correct: false, ratio, detail });

// Les libellés peuvent être vides pendant l'édition (brouillon) : la complétude
// est exigée à la publication (voir validateConfigForPublish plus bas).
const choiceSchema = z.object({ id: z.string().min(1), label: z.string().max(300).default("") });
const pairSchema = z.object({ id: z.string().min(1), left: z.string().max(200).default(""), right: z.string().max(200).default("") });

/* ------------------------------------------------------- 1. Code numérique */

const numericCode: PuzzleDefinition<{ digits: number | null; tolerance: number }, string, string> = {
  type: "NUMERIC_CODE",
  label: "Code numérique",
  description: "L'apprenant saisit un nombre ou un code chiffré. Ex. : « Quel est le total affiché en F24 ? » → 4832",
  icon: "lock",
  supportsMultipleAnswers: true,
  configSchema: z.object({ digits: z.number().int().min(1).max(20).nullable().default(null), tolerance: z.number().min(0).max(1000).default(0) }),
  submissionSchema: z.string().max(60),
  answerSchema: z.string().min(1).max(60),
  defaultConfig: () => ({ digits: null, tolerance: 0 }),
  validate({ config, answers, submission }) {
    const submitted = String(submission ?? "").trim();
    if (!submitted) return wrong();
    const submittedNumber = normalizeNumber(submitted);
    for (const answer of answers) {
      const expectedNumber = normalizeNumber(answer);
      if (expectedNumber !== null && submittedNumber !== null) {
        if (Math.abs(expectedNumber - submittedNumber) <= (config.tolerance ?? 0)) return correct();
      }
      if (normalizeCode(submitted) === normalizeCode(answer)) return correct();
    }
    return wrong();
  },
};

/* ---------------------------------------------------------- 2. Mot secret */

const secretWord: PuzzleDefinition<Record<string, never>, string, string> = {
  type: "SECRET_WORD",
  label: "Mot secret",
  description: "Un mot ou une expression à trouver. Ex. : « AUTOMATISATION ».",
  icon: "key",
  supportsMultipleAnswers: true,
  configSchema: z.object({}),
  submissionSchema: z.string().max(200),
  answerSchema: z.string().min(1).max(200),
  defaultConfig: () => ({}),
  validate({ answers, submission, options }) {
    const submitted = String(submission ?? "").trim();
    if (!submitted) return wrong();
    return answers.some((a) => normalizeText(a, options) === normalizeText(submitted, options)) ? correct() : wrong();
  },
};

/* ----------------------------------------------------------------- 3. QCM */

const mcq: PuzzleDefinition<{ choices: { id: string; label: string }[]; multiple: boolean; partialCredit: boolean }, string[], string[]> = {
  type: "MCQ",
  label: "QCM",
  description: "Une ou plusieurs bonnes réponses parmi des propositions.",
  icon: "list",
  supportsMultipleAnswers: false,
  configSchema: z.object({ choices: z.array(choiceSchema).min(2).max(10), multiple: z.boolean().default(false), partialCredit: z.boolean().default(false) }),
  submissionSchema: z.array(z.string().max(60)).max(10),
  answerSchema: z.array(z.string().max(60)).min(1).max(10),
  defaultConfig: () => ({
    choices: [
      { id: "a", label: "" },
      { id: "b", label: "" },
    ],
    multiple: false,
    partialCredit: false,
  }),
  validate({ config, answers, submission }) {
    const expected = new Set(answers[0] ?? []);
    const got = new Set(Array.isArray(submission) ? submission : []);
    if (expected.size === 0) return wrong();
    if (!config.multiple && got.size > 1) return wrong();
    const hits = [...got].filter((g) => expected.has(g)).length;
    const wrongPicks = got.size - hits;
    if (hits === expected.size && wrongPicks === 0) return correct();
    if (config.partialCredit) {
      const ratio = Math.max(0, (hits - wrongPicks) / expected.size);
      return wrong(ratio);
    }
    return wrong();
  },
};

/* ---------------------------------------------------------- 4. Vrai / Faux */

const trueFalse: PuzzleDefinition<Record<string, never>, boolean, boolean> = {
  type: "TRUE_FALSE",
  label: "Vrai / Faux",
  description: "Une affirmation à valider ou à réfuter.",
  icon: "check",
  supportsMultipleAnswers: false,
  configSchema: z.object({}),
  submissionSchema: z.boolean(),
  answerSchema: z.boolean(),
  defaultConfig: () => ({}),
  validate({ answers, submission }) {
    if (answers.length === 0) return wrong();
    return answers[0] === Boolean(submission) ? correct() : wrong();
  },
};

/* ------------------------------------------------------- 5. Réponse courte */

const shortAnswer: PuzzleDefinition<{ maxLength: number }, string, string> = {
  type: "SHORT_ANSWER",
  label: "Réponse courte",
  description: "Une réponse libre de quelques mots, comparée aux réponses acceptées (casse et accents ignorés par défaut).",
  icon: "text",
  supportsMultipleAnswers: true,
  configSchema: z.object({ maxLength: z.number().int().min(1).max(500).default(120) }),
  submissionSchema: z.string().max(500),
  answerSchema: z.string().min(1).max(500),
  defaultConfig: () => ({ maxLength: 120 }),
  validate({ answers, submission, options }) {
    const submitted = String(submission ?? "").trim();
    if (!submitted) return wrong();
    return answers.some((a) => normalizeText(a, options) === normalizeText(submitted, options)) ? correct() : wrong();
  },
};

/* --------------------------------------------------------- 6. Association */

const matching: PuzzleDefinition<{ pairs: { id: string; left: string; right: string }[]; partialCredit: boolean }, Record<string, string>, Record<string, string>> = {
  type: "MATCHING",
  label: "Association",
  description: "Associer chaque élément de gauche à l'élément de droite correspondant.",
  icon: "link",
  supportsMultipleAnswers: false,
  configSchema: z.object({ pairs: z.array(pairSchema).min(2).max(10), partialCredit: z.boolean().default(true) }),
  submissionSchema: z.record(z.string().max(60), z.string().max(60)),
  answerSchema: z.record(z.string().max(60), z.string().max(60)),
  defaultConfig: () => ({
    pairs: [
      { id: "p1", left: "", right: "" },
      { id: "p2", left: "", right: "" },
    ],
    partialCredit: true,
  }),
  validate({ config, answers, submission }) {
    const expected = answers[0] ?? Object.fromEntries(config.pairs.map((p) => [p.id, p.id]));
    const keys = Object.keys(expected);
    if (keys.length === 0) return wrong();
    const got = (submission ?? {}) as Record<string, string>;
    const hits = keys.filter((k) => got[k] === expected[k]).length;
    if (hits === keys.length) return correct();
    return wrong(config.partialCredit ? hits / keys.length : 0, `${hits}/${keys.length} associations correctes`);
  },
};

/* -------------------------------------------------------- 7. Ordre logique */

const ordering: PuzzleDefinition<{ items: { id: string; label: string }[]; partialCredit: boolean }, string[], string[]> = {
  type: "ORDERING",
  label: "Ordre logique",
  description: "Remettre des éléments dans le bon ordre (procédure, chronologie, priorités).",
  icon: "sort",
  supportsMultipleAnswers: false,
  configSchema: z.object({ items: z.array(choiceSchema).min(2).max(12), partialCredit: z.boolean().default(true) }),
  submissionSchema: z.array(z.string().max(60)).max(12),
  answerSchema: z.array(z.string().max(60)).min(2).max(12),
  defaultConfig: () => ({
    items: [
      { id: "i1", label: "" },
      { id: "i2", label: "" },
    ],
    partialCredit: true,
  }),
  validate({ config, answers, submission }) {
    const expected = answers[0] ?? config.items.map((i) => i.id);
    const got = Array.isArray(submission) ? submission : [];
    if (expected.length === 0) return wrong();
    if (got.length === expected.length && got.every((v, i) => v === expected[i])) return correct();
    const hits = expected.filter((v, i) => got[i] === v).length;
    return wrong(config.partialCredit ? hits / expected.length : 0, `${hits}/${expected.length} éléments bien placés`);
  },
};

/* ------------------------------------------------------------- 8. Séquence */

const sequence: PuzzleDefinition<{ visible: string[] }, string, string> = {
  type: "SEQUENCE",
  label: "Séquence",
  description: "Trouver la valeur ou l'étape suivante d'une suite. Ex. : 2, 4, 8, 16, … → 32",
  icon: "arrow",
  supportsMultipleAnswers: true,
  configSchema: z.object({ visible: z.array(z.string().max(60)).min(2).max(12) }),
  submissionSchema: z.string().max(60),
  answerSchema: z.string().min(1).max(60),
  defaultConfig: () => ({ visible: ["", "", ""] }),
  validate({ answers, submission, options }) {
    const submitted = String(submission ?? "").trim();
    if (!submitted) return wrong();
    const submittedNumber = normalizeNumber(submitted);
    for (const answer of answers) {
      const expectedNumber = normalizeNumber(answer);
      if (expectedNumber !== null && submittedNumber !== null && expectedNumber === submittedNumber) return correct();
      if (normalizeText(answer, options) === normalizeText(submitted, options)) return correct();
    }
    return wrong();
  },
};

/* ------------------------------------------------------ 9. Image interactive */

type Hotspot = { id: string; label: string; x: number; y: number; width: number; height: number };
const imageHotspot: PuzzleDefinition<{ imageUrl: string; hotspots: Hotspot[] }, { x: number; y: number }, string> = {
  type: "IMAGE_HOTSPOT",
  label: "Image interactive",
  description: "L'apprenant doit cliquer la bonne zone d'une image (capture d'écran, schéma, plan).",
  icon: "image",
  supportsMultipleAnswers: true,
  configSchema: z.object({
    imageUrl: z.string().max(500).default(""),
    hotspots: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().max(200).default(""),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          width: z.number().min(1).max(100),
          height: z.number().min(1).max(100),
        }),
      )
      .min(1)
      .max(10),
  }),
  submissionSchema: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  answerSchema: z.string().min(1).max(60),
  defaultConfig: () => ({ imageUrl: "", hotspots: [{ id: "h1", label: "", x: 40, y: 40, width: 20, height: 20 }] }),
  validate({ config, answers, submission }) {
    const point = submission as { x: number; y: number } | undefined;
    if (!point || typeof point.x !== "number" || typeof point.y !== "number") return wrong();
    const accepted = new Set(answers.length > 0 ? answers : config.hotspots.map((h) => h.id));
    const hit = config.hotspots.find(
      (h) => accepted.has(h.id) && point.x >= h.x && point.x <= h.x + h.width && point.y >= h.y && point.y <= h.y + h.height,
    );
    return hit ? correct(1, hit.label || undefined) : wrong();
  },
};

/* ------------------------------------------------------ 10. Fichier à analyser */

const fileAnalysis: PuzzleDefinition<{ fileUrl: string; fileName: string; answerKind: "text" | "number"; tolerance: number }, string, string> = {
  type: "FILE_ANALYSIS",
  label: "Fichier à analyser",
  description: "Le formateur fournit un fichier (Excel, PDF, CSV, image) ; l'apprenant l'analyse et saisit le résultat.",
  icon: "file",
  supportsMultipleAnswers: true,
  configSchema: z.object({
    fileUrl: z.string().max(500).default(""),
    fileName: z.string().max(200).default(""),
    answerKind: z.enum(["text", "number"]).default("text"),
    tolerance: z.number().min(0).max(1000).default(0),
  }),
  submissionSchema: z.string().max(300),
  answerSchema: z.string().min(1).max(300),
  defaultConfig: () => ({ fileUrl: "", fileName: "", answerKind: "text" as const, tolerance: 0 }),
  validate({ config, answers, submission, options }) {
    const submitted = String(submission ?? "").trim();
    if (!submitted) return wrong();
    if (config.answerKind === "number") {
      const got = normalizeNumber(submitted);
      if (got === null) return wrong();
      return answers.some((a) => {
        const exp = normalizeNumber(a);
        return exp !== null && Math.abs(exp - got) <= (config.tolerance ?? 0);
      })
        ? correct()
        : wrong();
    }
    return answers.some((a) => normalizeText(a, options) === normalizeText(submitted, options)) ? correct() : wrong();
  },
};

/* ------------------------------------------------------------------ registre */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const definitions: Record<PuzzleType, PuzzleDefinition<any, any, any>> = {
  NUMERIC_CODE: numericCode,
  SECRET_WORD: secretWord,
  MCQ: mcq,
  TRUE_FALSE: trueFalse,
  SHORT_ANSWER: shortAnswer,
  MATCHING: matching,
  ORDERING: ordering,
  SEQUENCE: sequence,
  IMAGE_HOTSPOT: imageHotspot,
  FILE_ANALYSIS: fileAnalysis,
};

export function getPuzzleDefinition(type: string) {
  const def = definitions[type as PuzzleType];
  if (!def) throw new Error(`Type d'énigme inconnu : ${type}`);
  return def;
}

export function isPuzzleType(value: string): value is PuzzleType {
  return (PUZZLE_TYPES as readonly string[]).includes(value);
}

export const puzzleCatalog = PUZZLE_TYPES.map((t) => {
  const d = definitions[t];
  return { type: t, label: d.label, description: d.description, icon: d.icon, supportsMultipleAnswers: d.supportsMultipleAnswers };
});

export const PUZZLE_LABELS = Object.fromEntries(PUZZLE_TYPES.map((t) => [t, definitions[t].label])) as Record<PuzzleType, string>;

export const defaultConfigFor = (type: string) => getPuzzleDefinition(type).defaultConfig();

/** Valide une soumission apprenant contre les réponses acceptées, côté serveur uniquement. */
export function validateSubmission(args: {
  type: string;
  config: unknown;
  answers: unknown[];
  submission: unknown;
  options: ValidationOptions;
}): ValidationResult {
  const def = getPuzzleDefinition(args.type);
  const parsedConfig = def.configSchema.safeParse(args.config);
  const config = parsedConfig.success ? parsedConfig.data : def.defaultConfig();
  const parsedSubmission = def.submissionSchema.safeParse(args.submission);
  if (!parsedSubmission.success) return { correct: false, ratio: 0, detail: "Réponse au mauvais format." };
  const answers = args.answers.map((a) => def.answerSchema.safeParse(a)).filter((r) => r.success).map((r) => r.data);
  if (answers.length === 0 && args.type !== "IMAGE_HOTSPOT" && args.type !== "MATCHING" && args.type !== "ORDERING") {
    return { correct: false, ratio: 0, detail: "Aucune réponse de référence." };
  }
  return def.validate({ config, answers, submission: parsedSubmission.data, options: args.options });
}

/**
 * Complétude de la configuration d'une énigme, vérifiée avant publication
 * (les brouillons peuvent rester incomplets pendant l'édition).
 */
export function validateConfigForPublish(type: string, rawConfig: unknown, answers: unknown[]): string[] {
  const def = getPuzzleDefinition(type);
  const parsed = def.configSchema.safeParse(rawConfig);
  if (!parsed.success) return ["la configuration de l'énigme est invalide"];
  const config = parsed.data;
  const issues: string[] = [];
  switch (type) {
    case "MCQ": {
      const c = config as { choices: { label: string }[] };
      if (c.choices.length < 2) issues.push("au moins deux propositions sont nécessaires");
      if (c.choices.some((x) => !x.label.trim())) issues.push("toutes les propositions doivent avoir un libellé");
      if (!Array.isArray(answers[0]) || (answers[0] as string[]).length === 0) issues.push("aucune bonne réponse cochée");
      break;
    }
    case "MATCHING": {
      const c = config as { pairs: { left: string; right: string }[] };
      if (c.pairs.some((p) => !p.left.trim() || !p.right.trim())) issues.push("chaque association doit être complète");
      break;
    }
    case "ORDERING": {
      const c = config as { items: { label: string }[] };
      if (c.items.some((i) => !i.label.trim())) issues.push("tous les éléments à ordonner doivent avoir un libellé");
      break;
    }
    case "SEQUENCE": {
      const c = config as { visible: string[] };
      if (c.visible.filter((v) => v.trim()).length < 2) issues.push("la séquence visible doit comporter au moins deux valeurs");
      break;
    }
    case "IMAGE_HOTSPOT": {
      const c = config as { imageUrl: string; hotspots: unknown[] };
      if (!c.imageUrl.trim()) issues.push("aucune image n'est importée");
      if (c.hotspots.length === 0) issues.push("aucune zone cliquable définie");
      break;
    }
    case "FILE_ANALYSIS": {
      const c = config as { fileUrl: string };
      if (!c.fileUrl.trim()) issues.push("aucun fichier à analyser n'est joint");
      break;
    }
    default:
      break;
  }
  return issues;
}

export { definitions as puzzleDefinitions };
