import { describe, expect, it } from "vitest";
import { constraintSchema, formatObjectives, missionBasicsSchema, parseObjectives, scenarioSchema } from "@/lib/data/mission-schemas";

const validBasics = {
  title: "48 heures pour lancer le produit",
  description: "",
  sector: "",
  jobTitle: "",
  level: "INTERMEDIATE",
  difficulty: "INTERMEDIATE",
  durationMinutes: "60",
  mode: "INDIVIDUAL",
};

describe("missionBasicsSchema", () => {
  it("convertit la durée en nombre et accepte une fiche minimale", () => {
    const r = missionBasicsSchema.safeParse(validBasics);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.durationMinutes).toBe(60);
  });

  it("refuse un titre trop court et une durée hors bornes", () => {
    expect(missionBasicsSchema.safeParse({ ...validBasics, title: "ab" }).success).toBe(false);
    expect(missionBasicsSchema.safeParse({ ...validBasics, durationMinutes: "2" }).success).toBe(false);
    expect(missionBasicsSchema.safeParse({ ...validBasics, durationMinutes: "600" }).success).toBe(false);
    expect(missionBasicsSchema.safeParse({ ...validBasics, durationMinutes: "soixante" }).success).toBe(false);
  });

  it("refuse un niveau, une difficulté ou un mode inconnus", () => {
    expect(missionBasicsSchema.safeParse({ ...validBasics, level: "GURU" }).success).toBe(false);
    expect(missionBasicsSchema.safeParse({ ...validBasics, mode: "SOLO" }).success).toBe(false);
  });

  it("retire les espaces autour du titre", () => {
    const r = missionBasicsSchema.safeParse({ ...validBasics, title: "  Ma mission  " });
    expect(r.success && r.data.title).toBe("Ma mission");
  });
});

describe("objectifs pédagogiques", () => {
  it("découpe une ligne par objectif en retirant les puces", () => {
    expect(parseObjectives("- Analyser des données\n• Arbitrer sous contrainte\n\n  * Rédiger une recommandation  ")).toEqual([
      "Analyser des données",
      "Arbitrer sous contrainte",
      "Rédiger une recommandation",
    ]);
  });
  it("borne le nombre d'objectifs et gère l'absence de saisie", () => {
    expect(parseObjectives(Array.from({ length: 30 }, (_, i) => `Objectif ${i}`).join("\n"))).toHaveLength(12);
    expect(parseObjectives(undefined)).toEqual([]);
    expect(parseObjectives("   ")).toEqual([]);
  });
  it("fait l'aller-retour avec l'affichage et tolère un JSON invalide", () => {
    const json = JSON.stringify(parseObjectives("A\nB"));
    expect(formatObjectives(json)).toBe("A\nB");
    expect(formatObjectives("pas du json")).toBe("");
    expect(formatObjectives('"chaîne"')).toBe("");
  });
});

describe("constraintSchema", () => {
  it("convertit la valeur et accepte les unités", () => {
    const r = constraintSchema.safeParse({ label: "Budget maximum", type: "BUDGET", operator: "MAX", value: "30000", unit: "€", description: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.value).toBe(30000);
  });
  it("accepte une valeur décimale ou négative", () => {
    expect(constraintSchema.safeParse({ label: "Marge", type: "TARGET", operator: "MIN", value: "12.5" }).success).toBe(true);
    expect(constraintSchema.safeParse({ label: "Écart", type: "CUSTOM", operator: "MAX", value: "-5" }).success).toBe(true);
  });
  it("refuse une valeur non numérique, un type ou une comparaison inconnus", () => {
    expect(constraintSchema.safeParse({ label: "Budget", type: "BUDGET", operator: "MAX", value: "beaucoup" }).success).toBe(false);
    expect(constraintSchema.safeParse({ label: "Budget", type: "ARGENT", operator: "MAX", value: "10" }).success).toBe(false);
    expect(constraintSchema.safeParse({ label: "Budget", type: "BUDGET", operator: "PLUS_GRAND", value: "10" }).success).toBe(false);
  });
});

describe("scenarioSchema", () => {
  it("accepte un briefing vide (la mission se complète progressivement)", () => {
    expect(scenarioSchema.safeParse({}).success).toBe(true);
  });
  it("borne la longueur du briefing", () => {
    expect(scenarioSchema.safeParse({ briefing: "x".repeat(3001) }).success).toBe(false);
  });
});
