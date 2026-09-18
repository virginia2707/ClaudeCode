import { createHash } from "node:crypto";
import type { JokerType } from "@/lib/constants";

/**
 * Deterministically pick two wrong answers to hide for the 50/50 joker so a
 * reconnecting player sees the same board. Seeded by player + question.
 */
export function fiftyFiftyHidden(answers: { id: string; isCorrect: boolean }[], seed: string): string[] {
  const wrong = answers.filter((a) => !a.isCorrect).map((a) => a.id);
  if (wrong.length <= 2) return wrong;
  const hash = createHash("sha256").update(seed).digest();
  // Fisher–Yates with bytes from the hash as the random source.
  const arr = [...wrong];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = hash[i % hash.length] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 2).sort();
}

export type JokerUseResult = {
  type: JokerType;
  remaining: number;
  hiddenAnswerIds?: string[];
  extraMs?: number;
};
