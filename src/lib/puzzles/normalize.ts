import type { ValidationOptions } from "@/lib/puzzles/types";

/**
 * Normalisation des réponses texte. Par défaut on ignore :
 * - la casse ;
 * - les accents et signes diacritiques ;
 * - les espaces en début/fin et les espaces multiples ;
 * - les espaces insécables et tabulations.
 * Le formateur peut rendre une énigme sensible à la casse et/ou aux accents.
 */
export function normalizeText(value: string, options: ValidationOptions): string {
  let out = value.replace(/[\s  ]+/g, " ").trim();
  if (!options.caseSensitive) out = out.toLocaleLowerCase("fr-FR");
  if (!options.accentSensitive) out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return out;
}

/** Normalisation d'un code : ignore espaces, tirets, points et casse. */
export function normalizeCode(value: string): string {
  return value.replace(/[\s  ._-]/g, "").toLocaleUpperCase("fr-FR");
}

/** Normalisation d'un nombre saisi : accepte « 4 832,50 », « 4832.50 », « 4_832 ». */
export function normalizeNumber(value: string): number | null {
  const cleaned = value.replace(/[\s  _]/g, "").replace(/,/g, ".");
  if (!/^[+-]?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function textEquals(a: string, b: string, options: ValidationOptions) {
  return normalizeText(a, options) === normalizeText(b, options);
}
