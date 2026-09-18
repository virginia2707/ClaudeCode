import { randomInt } from "node:crypto";

/** Alphabet without visually ambiguous characters (0/O, 1/I/L). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function generateCode(length = CODE_LENGTH, random: (max: number) => number = (max) => randomInt(0, max)): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return out;
}

/** Normalise user input: uppercase, strip spaces/dashes, map ambiguous glyphs. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/0/g, "O")
    .replace(/[IL]/g, "1")
    .replace(/1/g, "I")
    .slice(0, CODE_LENGTH);
}

export function isValidCodeFormat(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}
