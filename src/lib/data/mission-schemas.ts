import { z } from "zod";
import { CONSTRAINT_OPERATORS, CONSTRAINT_TYPES, LEVELS, MISSION_MODES, SCORING_MODES } from "@/lib/constants";

const trimmed = (max: number) => z.string().trim().max(max);

export const missionBasicsSchema = z.object({
  title: z.string().trim().min(3, "3 caractères minimum.").max(120, "120 caractères maximum."),
  description: trimmed(600).optional().or(z.literal("")),
  sector: trimmed(80).optional().or(z.literal("")),
  jobTitle: trimmed(80).optional().or(z.literal("")),
  level: z.enum(LEVELS),
  difficulty: z.enum(LEVELS),
  durationMinutes: z.coerce.number().int("Nombre entier attendu.").min(5, "5 minutes minimum.").max(480, "480 minutes maximum."),
  mode: z.enum(MISSION_MODES),
});

export const missionSettingsSchema = z.object({
  objectives: trimmed(1500).optional().or(z.literal("")),
  expectedOutcome: trimmed(600).optional().or(z.literal("")),
  scoringMode: z.enum(SCORING_MODES),
  coachEnabled: z.union([z.literal("on"), z.literal("")]).optional(),
});

export const scenarioSchema = z.object({
  companyName: trimmed(120).optional().or(z.literal("")),
  setting: trimmed(200).optional().or(z.literal("")),
  context: trimmed(1500).optional().or(z.literal("")),
  problem: trimmed(1000).optional().or(z.literal("")),
  stakes: trimmed(600).optional().or(z.literal("")),
  timeframe: trimmed(120).optional().or(z.literal("")),
  briefing: trimmed(3000).optional().or(z.literal("")),
  openingMessage: trimmed(1500).optional().or(z.literal("")),
});

export const learnerRoleSchema = z.object({
  title: z.string().trim().min(2, "2 caractères minimum.").max(120),
  department: trimmed(120).optional().or(z.literal("")),
  seniority: trimmed(120).optional().or(z.literal("")),
  reportsTo: trimmed(120).optional().or(z.literal("")),
  responsibilities: trimmed(1000).optional().or(z.literal("")),
});

export const constraintSchema = z.object({
  label: z.string().trim().min(2, "2 caractères minimum.").max(80),
  type: z.enum(CONSTRAINT_TYPES),
  operator: z.enum(CONSTRAINT_OPERATORS),
  value: z.coerce.number("Valeur numérique attendue.").finite("Valeur numérique attendue."),
  unit: trimmed(16).optional().or(z.literal("")),
  description: trimmed(300).optional().or(z.literal("")),
});

/** Objectifs pédagogiques : une ligne = un objectif. */
export function parseObjectives(raw: string | undefined): string[] {
  if (!raw) return [];
  // Retirer d'abord l'indentation, sinon une puce précédée d'espaces
  // (« ␣␣* Objectif ») resterait dans le texte.
  return raw
    .split("\n")
    .map((line) => line.trim().replace(/^[-–—•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function formatObjectives(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.join("\n") : "";
  } catch {
    return "";
  }
}
