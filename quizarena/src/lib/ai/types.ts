import type { Difficulty } from "@/lib/constants";

export type GenerateQuestionsInput = {
  topic: string;
  level: Difficulty;
  count: number;
  /** MVP supports a single question type: single-answer QCM. */
  type: "QCM";
  skills: string[];
};

export type GeneratedQuestion = {
  text: string;
  answers: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
  timeLimit: number;
  points: number;
  category: string;
  skills: string[];
};

/**
 * A provider turns a generation request into draft questions. Implementations
 * must never publish anything themselves — the caller always presents drafts
 * for the trainer to edit and explicitly add to the quiz.
 */
export interface AIProvider {
  readonly name: string;
  generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]>;
}

export class AIServiceError extends Error {}
