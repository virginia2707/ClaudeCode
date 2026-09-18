import { randomInt } from "node:crypto";

// Alphabet sans caractères ambigus (ni O/0, ni I/1, ni L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateSessionCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function isValidSessionCode(code: string) {
  return /^[A-Z0-9]{6}$/.test(code) && [...code].every((c) => ALPHABET.includes(c));
}

export function normalizeSessionCode(raw: string) {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}
