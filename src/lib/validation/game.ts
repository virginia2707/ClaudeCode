import { z } from "zod";
import { CATEGORIES, DIFFICULTIES, GAME_MODES, LEADERBOARD_METHODS, LEVELS, TIMER_MODES } from "@/lib/constants";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(https?:\/\/|\/api\/files\/)/.test(v), "URL invalide (http(s):// ou fichier importé)")
  .optional()
  .default("");

const intField = (min: number, max: number, message: string) =>
  z.coerce.number({ error: message }).int(message).min(min, message).max(max, message);

export const gameInfoSchema = z.object({
  title: z.string().trim().min(3, "Titre trop court (3 caractères minimum)").max(120, "Titre trop long"),
  description: z.string().trim().max(1000, "Description trop longue (1000 caractères)").default(""),
  category: z.enum(CATEGORIES, { error: "Catégorie invalide" }),
  level: z.enum(LEVELS, { error: "Niveau invalide" }),
  difficulty: z.enum(DIFFICULTIES, { error: "Difficulté invalide" }),
  estimatedMinutes: intField(5, 480, "Durée estimée entre 5 et 480 minutes"),
  objective: z.string().trim().max(1000, "Objectif trop long").default(""),
  targetSkills: z.string().trim().max(600).default(""),
  scenario: z.string().trim().max(4000, "Scénario trop long (4000 caractères)").default(""),
  introduction: z.string().trim().max(2000, "Introduction trop longue").default(""),
  finalMessage: z.string().trim().max(2000, "Message final trop long").default(""),
  coverImageUrl: optionalUrl,
  mode: z.enum(GAME_MODES, { error: "Mode invalide" }),
  maxParticipants: intField(1, 1000, "Entre 1 et 1000 participants"),
});
export type GameInfoInput = z.infer<typeof gameInfoSchema>;

export function parseTargetSkills(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.slice(0, 80)),
    ),
  ).slice(0, 20);
}

export const gameSettingsSchema = z
  .object({
    timerMode: z.enum(TIMER_MODES, { error: "Mode de chronomètre invalide" }),
    maxMinutes: z.coerce.number().int().min(1).max(480).optional(),
    pauseAllowed: z.boolean().default(false),
    endOnTimeout: z.boolean().default(false),
    basePoints: intField(0, 10000, "Points de base entre 0 et 10000"),
    timeBonusEnabled: z.boolean().default(false),
    timeBonusMax: intField(0, 10000, "Bonus temps entre 0 et 10000"),
    noHintBonusEnabled: z.boolean().default(false),
    noHintBonus: intField(0, 10000, "Bonus sans indice entre 0 et 10000"),
    streakBonusEnabled: z.boolean().default(false),
    streakBonus: intField(0, 10000, "Bonus série entre 0 et 10000"),
    hintPenaltyEnabled: z.boolean().default(false),
    wrongAnswerPenalty: intField(0, 1000, "Pénalité erreur entre 0 et 1000"),
    timeoutPenalty: intField(0, 10000, "Pénalité dépassement entre 0 et 10000"),
    leaderboardEnabled: z.boolean().default(false),
    leaderboardMethod: z.enum(LEADERBOARD_METHODS, { error: "Méthode de classement invalide" }),
    showLiveRanking: z.boolean().default(false),
    soundEnabled: z.boolean().default(false),
    musicEnabled: z.boolean().default(false),
    animationsEnabled: z.boolean().default(false),
  })
  .refine((v) => v.timerMode === "NONE" || (v.maxMinutes ?? 0) > 0, { message: "Indiquez une durée maximale", path: ["maxMinutes"] });
export type GameSettingsInput = z.infer<typeof gameSettingsSchema>;

/** Convertit un FormData en objet brut (checkbox → boolean). */
export function formToObject(formData: FormData, booleans: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  for (const b of booleans) out[b] = formData.get(b) === "on" || formData.get(b) === "true";
  return out;
}
