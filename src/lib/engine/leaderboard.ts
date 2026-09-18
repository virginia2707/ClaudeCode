import type { LeaderboardMethod } from "@/lib/constants";

export type LeaderboardEntry = {
  actorId: string;
  name: string;
  score: number;
  stepsCompleted: number;
  skillsValidated: number;
  hintsUsed: number;
  wrongAnswers: number;
  timeSpentSeconds: number;
  completed: boolean;
};

type Comparator = (a: LeaderboardEntry, b: LeaderboardEntry) => number;

const byCompletion: Comparator = (a, b) => Number(b.completed) - Number(a.completed);
const bySteps: Comparator = (a, b) => b.stepsCompleted - a.stepsCompleted;
const bySkills: Comparator = (a, b) => b.skillsValidated - a.skillsValidated;
const byScore: Comparator = (a, b) => b.score - a.score;
const byFewestHints: Comparator = (a, b) => a.hintsUsed - b.hintsUsed;
const byFewestWrong: Comparator = (a, b) => a.wrongAnswers - b.wrongAnswers;
const byTime: Comparator = (a, b) => a.timeSpentSeconds - b.timeSpentSeconds;
const byName: Comparator = (a, b) => a.name.localeCompare(b.name, "fr");

/**
 * Chaînes de tri par méthode. Le mode PEDAGOGICAL place délibérément la
 * rapidité en dernier critère : compétences > vitesse.
 */
const CHAINS: Record<LeaderboardMethod, Comparator[]> = {
  PEDAGOGICAL: [bySteps, bySkills, byScore, byFewestHints, byFewestWrong, byTime, byName],
  SCORE: [byScore, bySteps, byTime, byName],
  TIME: [byCompletion, byTime, byScore, byName],
  COMPLETION: [byCompletion, bySteps, byScore, byName],
  HINTS: [byFewestHints, bySteps, byScore, byName],
};

export function rankEntries(entries: LeaderboardEntry[], method: LeaderboardMethod): (LeaderboardEntry & { rank: number })[] {
  const chain = CHAINS[method] ?? CHAINS.PEDAGOGICAL;
  const sorted = [...entries].sort((a, b) => {
    for (const cmp of chain) {
      const r = cmp(a, b);
      if (r !== 0) return r;
    }
    return 0;
  });
  // Rangs ex æquo : même rang pour des entrées indiscernables selon la chaîne.
  const out: (LeaderboardEntry & { rank: number })[] = [];
  let rank = 0;
  let previous: LeaderboardEntry | null = null;
  sorted.forEach((entry, index) => {
    const tied = previous !== null && chain.every((cmp) => cmp(previous as LeaderboardEntry, entry) === 0);
    rank = tied ? rank : index + 1;
    out.push({ ...entry, rank });
    previous = entry;
  });
  return out;
}
