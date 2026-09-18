import { describe, expect, it } from "vitest";
import { gameInfoSchema, gameSettingsSchema, parseTargetSkills } from "@/lib/validation/game";

const base = {
  title: "Mission Excel",
  description: "",
  category: "BUREAUTIQUE",
  level: "INTERMEDIATE",
  difficulty: "MEDIUM",
  estimatedMinutes: "45",
  objective: "",
  targetSkills: "",
  scenario: "",
  introduction: "",
  finalMessage: "",
  coverImageUrl: "",
  mode: "INDIVIDUAL",
  maxParticipants: "30",
};

describe("gameInfoSchema", () => {
  it("accepte un jeu minimal et convertit les nombres", () => {
    const r = gameInfoSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.estimatedMinutes).toBe(45);
      expect(r.data.maxParticipants).toBe(30);
    }
  });
  it("refuse un titre trop court et une durée hors bornes", () => {
    const r = gameInfoSchema.safeParse({ ...base, title: "ab", estimatedMinutes: "2" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("title");
      expect(paths).toContain("estimatedMinutes");
    }
  });
  it("refuse une URL de couverture non http et accepte un fichier importé", () => {
    expect(gameInfoSchema.safeParse({ ...base, coverImageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(gameInfoSchema.safeParse({ ...base, coverImageUrl: "/api/files/abc.png" }).success).toBe(true);
  });
  it("refuse une catégorie inconnue", () => {
    expect(gameInfoSchema.safeParse({ ...base, category: "HACK" }).success).toBe(false);
  });
});

describe("parseTargetSkills", () => {
  it("découpe, nettoie et dédoublonne", () => {
    expect(parseTargetSkills(" Formules, Références absolues ;Formules\nRecherche ")).toEqual(["Formules", "Références absolues", "Recherche"]);
  });
});

describe("gameSettingsSchema", () => {
  const settings = {
    timerMode: "GLOBAL",
    maxMinutes: "45",
    pauseAllowed: true,
    endOnTimeout: true,
    basePoints: "100",
    timeBonusEnabled: true,
    timeBonusMax: "50",
    noHintBonusEnabled: true,
    noHintBonus: "20",
    streakBonusEnabled: false,
    streakBonus: "10",
    hintPenaltyEnabled: true,
    wrongAnswerPenalty: "0",
    timeoutPenalty: "0",
    leaderboardEnabled: true,
    leaderboardMethod: "PEDAGOGICAL",
    showLiveRanking: true,
    soundEnabled: false,
    musicEnabled: false,
    animationsEnabled: true,
  };
  it("accepte des réglages valides", () => {
    expect(gameSettingsSchema.safeParse(settings).success).toBe(true);
  });
  it("exige une durée quand le chronomètre est actif", () => {
    const r = gameSettingsSchema.safeParse({ ...settings, maxMinutes: undefined });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["maxMinutes"]);
  });
  it("accepte l'absence de durée sans chronomètre", () => {
    expect(gameSettingsSchema.safeParse({ ...settings, timerMode: "NONE", maxMinutes: undefined }).success).toBe(true);
  });
});
