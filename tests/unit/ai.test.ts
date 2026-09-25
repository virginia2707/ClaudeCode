import { describe, expect, it } from "vitest";
import { StubAIProvider } from "@/lib/ai/stub-provider";
import { generatedGameSchema, generationRequestSchema } from "@/lib/ai/types";

const provider = new StubAIProvider();

describe("requête de génération", () => {
  const base = { subject: "Excel", level: "INTERMEDIATE", durationMinutes: "45", stepCount: "5", objectives: "", audience: "" };
  it("accepte une demande valide et convertit les nombres", () => {
    const r = generationRequestSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.stepCount).toBe(5);
  });
  it("refuse un nombre d'étapes hors bornes", () => {
    expect(generationRequestSchema.safeParse({ ...base, stepCount: "1" }).success).toBe(false);
    expect(generationRequestSchema.safeParse({ ...base, stepCount: "20" }).success).toBe(false);
  });
  it("refuse une durée hors bornes", () => {
    expect(generationRequestSchema.safeParse({ ...base, durationMinutes: "5" }).success).toBe(false);
  });
  it("refuse un niveau inconnu", () => {
    expect(generationRequestSchema.safeParse({ ...base, level: "WIZARD" }).success).toBe(false);
  });
});

describe("fournisseur hors-ligne", () => {
  const request = generationRequestSchema.parse({
    subject: "Excel",
    level: "INTERMEDIATE",
    durationMinutes: "45",
    stepCount: "5",
    objectives: "Formules, Références absolues, Recherche de données",
    audience: "",
  });

  it("est toujours disponible, sans clé d'API", () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it("produit une structure conforme au schéma partagé", async () => {
    const game = await provider.generateGame(request);
    expect(generatedGameSchema.safeParse(game).success).toBe(true);
  });

  it("respecte le nombre d'étapes demandé", async () => {
    const game = await provider.generateGame(request);
    expect(game.steps).toHaveLength(5);
    const three = await provider.generateGame({ ...request, stepCount: 3 });
    expect(three.steps).toHaveLength(3);
  });

  it("relie chaque étape à une compétence et à au moins une réponse", async () => {
    const game = await provider.generateGame(request);
    for (const step of game.steps) {
      expect(step.skill.length).toBeGreaterThan(0);
      expect(step.answers.length).toBeGreaterThan(0);
      expect(step.answers[0].trim().length).toBeGreaterThan(0);
    }
  });

  it("reprend les compétences fournies par le formateur", async () => {
    const game = await provider.generateGame(request);
    expect(game.skills).toContain("Formules");
    expect(game.skills).toContain("Recherche de données");
  });

  it("termine par une mission finale de type QCM complet", async () => {
    const game = await provider.generateGame(request);
    const last = game.steps[game.steps.length - 1];
    expect(last.puzzleType).toBe("MCQ");
    expect(last.choices.length).toBeGreaterThanOrEqual(2);
    expect(last.correctChoiceIndexes.length).toBeGreaterThan(0);
  });

  it("répartit le temps en cohérence avec la durée demandée", async () => {
    const game = await provider.generateGame(request);
    const total = game.steps.reduce((acc, s) => acc + s.recommendedSeconds, 0);
    expect(total).toBeLessThanOrEqual(45 * 60);
    expect(total).toBeGreaterThan(45 * 60 * 0.5);
  });

  it("est déterministe pour une même demande", async () => {
    const a = await provider.generateGame(request);
    const b = await provider.generateGame(request);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
