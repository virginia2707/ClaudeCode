import type { ZodType } from "zod";

// Types d'énigmes supportés par le moteur. Ajouter un type = ajouter une
// définition dans le registre (src/lib/puzzles/registry.ts) + un composant
// apprenant et un éditeur formateur qui lisent ce type.
export const PUZZLE_TYPES = [
  "NUMERIC_CODE",
  "SECRET_WORD",
  "MCQ",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "MATCHING",
  "ORDERING",
  "SEQUENCE",
  "IMAGE_HOTSPOT",
  "FILE_ANALYSIS",
] as const;
export type PuzzleType = (typeof PUZZLE_TYPES)[number];

export type ValidationOptions = {
  caseSensitive: boolean;
  accentSensitive: boolean;
};

export type ValidationResult = {
  correct: boolean;
  /** Score partiel entre 0 et 1 (utile pour association/ordre). */
  ratio?: number;
  detail?: string;
};

/**
 * Contrat d'un type d'énigme. `Config` est ce que le formateur configure,
 * `Submission` ce que l'apprenant envoie, `AnswerValue` la forme d'une réponse
 * acceptée (stockée en JSON dans `Answer.value`).
 */
export interface PuzzleDefinition<Config = unknown, Submission = unknown, AnswerValue = unknown> {
  type: PuzzleType;
  label: string;
  description: string;
  icon: string;
  /** Schéma de la configuration formateur. */
  configSchema: ZodType<Config>;
  /** Schéma de la soumission apprenant. */
  submissionSchema: ZodType<Submission>;
  /** Schéma d'une réponse acceptée. */
  answerSchema: ZodType<AnswerValue>;
  defaultConfig(): Config;
  /** Le type accepte-t-il plusieurs réponses alternatives ? */
  supportsMultipleAnswers: boolean;
  /** Validation serveur, pure et déterministe. */
  validate(args: {
    config: Config;
    answers: AnswerValue[];
    submission: Submission;
    options: ValidationOptions;
  }): ValidationResult;
}
