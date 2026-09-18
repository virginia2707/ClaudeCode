import { describe, expect, it } from "vitest";
import { normalizeCode, normalizeNumber, normalizeText } from "@/lib/puzzles/normalize";
import { PUZZLE_TYPES } from "@/lib/puzzles/types";
import { defaultConfigFor, getPuzzleDefinition, puzzleCatalog, validateSubmission } from "@/lib/puzzles/registry";

const loose = { caseSensitive: false, accentSensitive: false };
const strict = { caseSensitive: true, accentSensitive: true };

describe("normalisation", () => {
  it("ignore casse, accents et espaces superflus par défaut", () => {
    expect(normalizeText("  Élève   Modèle ", loose)).toBe("eleve modele");
    expect(normalizeText("Élève Modèle", strict)).toBe("Élève Modèle");
  });
  it("normalise les codes en ignorant tirets et points", () => {
    expect(normalizeCode(" a1-b2.c3 ")).toBe("A1B2C3");
  });
  it("accepte les nombres au format français", () => {
    expect(normalizeNumber("4 832,50")).toBe(4832.5);
    expect(normalizeNumber("4832.50")).toBe(4832.5);
    expect(normalizeNumber("abc")).toBeNull();
  });
});

describe("registre", () => {
  it("expose une définition complète pour chaque type", () => {
    expect(puzzleCatalog).toHaveLength(PUZZLE_TYPES.length);
    for (const type of PUZZLE_TYPES) {
      const def = getPuzzleDefinition(type);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.configSchema.safeParse(defaultConfigFor(type)).success).toBe(true);
    }
  });
  it("rejette un type inconnu", () => {
    expect(() => getPuzzleDefinition("NOPE")).toThrow();
  });
});

const run = (type: string, answers: unknown[], submission: unknown, config?: unknown, options = loose) =>
  validateSubmission({ type, config: config ?? defaultConfigFor(type), answers, submission, options });

describe("NUMERIC_CODE", () => {
  it("accepte le code exact et les variantes d'écriture", () => {
    expect(run("NUMERIC_CODE", ["4832"], "4832").correct).toBe(true);
    expect(run("NUMERIC_CODE", ["4832"], " 4 832 ").correct).toBe(true);
    expect(run("NUMERIC_CODE", ["4832"], "4833").correct).toBe(false);
  });
  it("applique la tolérance", () => {
    expect(run("NUMERIC_CODE", ["100"], "102", { digits: null, tolerance: 2 }).correct).toBe(true);
    expect(run("NUMERIC_CODE", ["100"], "103", { digits: null, tolerance: 2 }).correct).toBe(false);
  });
  it("refuse une réponse vide", () => {
    expect(run("NUMERIC_CODE", ["4832"], "").correct).toBe(false);
  });
});

describe("SECRET_WORD", () => {
  it("ignore casse et accents par défaut", () => {
    expect(run("SECRET_WORD", ["AUTOMATISATION"], "automatisation").correct).toBe(true);
    expect(run("SECRET_WORD", ["Référence"], "reference").correct).toBe(true);
  });
  it("respecte la sensibilité quand elle est activée", () => {
    expect(run("SECRET_WORD", ["Référence"], "reference", undefined, strict).correct).toBe(false);
  });
  it("accepte plusieurs réponses alternatives", () => {
    expect(run("SECRET_WORD", ["RECHERCHEV", "RECHERCHEX"], "recherchex").correct).toBe(true);
  });
});

describe("MCQ", () => {
  const config = { choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }], multiple: true, partialCredit: true };
  it("valide une sélection multiple exacte", () => {
    expect(run("MCQ", [["a", "c"]], ["c", "a"], config).correct).toBe(true);
  });
  it("donne un score partiel", () => {
    const r = run("MCQ", [["a", "c"]], ["a"], config);
    expect(r.correct).toBe(false);
    expect(r.ratio).toBeCloseTo(0.5);
  });
  it("pénalise une mauvaise sélection", () => {
    expect(run("MCQ", [["a", "c"]], ["a", "b"], config).ratio).toBeCloseTo(0);
  });
  it("refuse plusieurs réponses en mode choix unique", () => {
    expect(run("MCQ", [["a"]], ["a", "b"], { ...config, multiple: false }).correct).toBe(false);
  });
});

describe("TRUE_FALSE", () => {
  it("compare des booléens", () => {
    expect(run("TRUE_FALSE", [true], true).correct).toBe(true);
    expect(run("TRUE_FALSE", [true], false).correct).toBe(false);
  });
  it("refuse un format invalide", () => {
    expect(run("TRUE_FALSE", [true], "oui").correct).toBe(false);
  });
});

describe("MATCHING", () => {
  const config = { pairs: [{ id: "p1", left: "SOMME", right: "Addition" }, { id: "p2", left: "MOYENNE", right: "Moyenne" }], partialCredit: true };
  it("valide une association complète", () => {
    expect(run("MATCHING", [{ p1: "p1", p2: "p2" }], { p1: "p1", p2: "p2" }, config).correct).toBe(true);
  });
  it("donne un score partiel", () => {
    const r = run("MATCHING", [{ p1: "p1", p2: "p2" }], { p1: "p1", p2: "p1" }, config);
    expect(r.correct).toBe(false);
    expect(r.ratio).toBeCloseTo(0.5);
  });
});

describe("ORDERING", () => {
  const config = { items: [{ id: "i1", label: "Un" }, { id: "i2", label: "Deux" }, { id: "i3", label: "Trois" }], partialCredit: true };
  it("valide l'ordre exact", () => {
    expect(run("ORDERING", [["i1", "i2", "i3"]], ["i1", "i2", "i3"], config).correct).toBe(true);
  });
  it("compte les éléments bien placés", () => {
    const r = run("ORDERING", [["i1", "i2", "i3"]], ["i1", "i3", "i2"], config);
    expect(r.correct).toBe(false);
    expect(r.ratio).toBeCloseTo(1 / 3);
  });
});

describe("SEQUENCE", () => {
  it("accepte la valeur suivante en nombre ou en texte", () => {
    expect(run("SEQUENCE", ["32"], "32", { visible: ["2", "4", "8", "16"] }).correct).toBe(true);
    expect(run("SEQUENCE", ["Trente-deux"], "trente-deux", { visible: ["a"] }).correct).toBe(true);
  });
});

describe("IMAGE_HOTSPOT", () => {
  const config = { imageUrl: "/api/files/x.png", hotspots: [{ id: "h1", label: "Cellule F24", x: 10, y: 10, width: 20, height: 10 }] };
  it("valide un clic dans la zone", () => {
    expect(run("IMAGE_HOTSPOT", ["h1"], { x: 15, y: 15 }, config).correct).toBe(true);
  });
  it("refuse un clic hors zone", () => {
    expect(run("IMAGE_HOTSPOT", ["h1"], { x: 80, y: 80 }, config).correct).toBe(false);
  });
});

describe("FILE_ANALYSIS", () => {
  it("compare du texte ou un nombre avec tolérance", () => {
    expect(run("FILE_ANALYSIS", ["Anomalie"], "anomalie", { fileUrl: "", fileName: "", answerKind: "text", tolerance: 0 }).correct).toBe(true);
    expect(run("FILE_ANALYSIS", ["1500"], "1 502", { fileUrl: "", fileName: "", answerKind: "number", tolerance: 5 }).correct).toBe(true);
    expect(run("FILE_ANALYSIS", ["1500"], "1600", { fileUrl: "", fileName: "", answerKind: "number", tolerance: 5 }).correct).toBe(false);
  });
});

describe("sécurité de la validation", () => {
  it("refuse une soumission au mauvais format sans planter", () => {
    expect(run("MCQ", [["a"]], { hack: true }).correct).toBe(false);
    expect(run("NUMERIC_CODE", ["1"], { toString: "x" }).correct).toBe(false);
  });
  it("refuse quand aucune réponse de référence n'est définie", () => {
    expect(run("SHORT_ANSWER", [], "test").correct).toBe(false);
  });
});

describe("validateConfigForPublish", () => {
  it("signale un QCM incomplet", async () => {
    const { validateConfigForPublish } = await import("@/lib/puzzles/registry");
    const issues = validateConfigForPublish("MCQ", { choices: [{ id: "a", label: "" }, { id: "b", label: "B" }], multiple: false, partialCredit: false }, []);
    expect(issues.length).toBe(2);
  });
  it("accepte un QCM complet", async () => {
    const { validateConfigForPublish } = await import("@/lib/puzzles/registry");
    const issues = validateConfigForPublish("MCQ", { choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }], multiple: false, partialCredit: false }, [["a"]]);
    expect(issues).toEqual([]);
  });
  it("exige un fichier pour FILE_ANALYSIS et une image pour IMAGE_HOTSPOT", async () => {
    const { validateConfigForPublish, defaultConfigFor } = await import("@/lib/puzzles/registry");
    expect(validateConfigForPublish("FILE_ANALYSIS", defaultConfigFor("FILE_ANALYSIS"), ["x"])).toContain("aucun fichier à analyser n'est joint");
    expect(validateConfigForPublish("IMAGE_HOTSPOT", defaultConfigFor("IMAGE_HOTSPOT"), ["h1"])).toContain("aucune image n'est importée");
  });
});
