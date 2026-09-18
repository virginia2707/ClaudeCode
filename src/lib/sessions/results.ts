import "server-only";
import { prisma } from "@/lib/prisma";
import { readSnapshot } from "@/lib/sessions/snapshot";
import { readStepStates } from "@/lib/engine/progress";
import { rankEntries, type LeaderboardEntry } from "@/lib/engine/leaderboard";
import type { LeaderboardMethod } from "@/lib/constants";

export type ResultRow = LeaderboardEntry & {
  rank: number;
  progressId: string;
  members: string[];
  badges: string[];
  skills: { name: string; validated: boolean }[];
};

export type SessionResults = {
  session: { id: string; code: string; status: string; mode: string; gameId: string; gameTitle: string; leaderboardMethod: string; endedAt: string | null };
  rows: ResultRow[];
  summary: {
    participants: number;
    completionRate: number;
    averageScore: number;
    medianScore: number;
    averageTimeSeconds: number;
    abandonRate: number;
    hintRate: number;
  };
  steps: {
    id: string;
    title: string;
    completed: number;
    attempts: number;
    wrong: number;
    hints: number;
    successRate: number;
    averageAttempts: number;
  }[];
  skills: { name: string; validated: number; total: number; rate: number }[];
};

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
};

/** Résultats consolidés d'une session : classement, statistiques, compétences. */
export async function getSessionResults(sessionId: string): Promise<SessionResults | null> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      progresses: {
        include: {
          player: true,
          team: { include: { members: { include: { player: true } } } },
          badges: { include: { badge: true } },
          result: true,
          hintRequests: true,
        },
      },
    },
  });
  if (!session) return null;
  const snapshot = readSnapshot(session.gameSnapshot);

  const entries: LeaderboardEntry[] = [];
  const skillTotals = new Map<string, { validated: number; total: number }>();

  const rowsRaw = session.progresses.map((p) => {
    const states = readStepStates(p.stepStates);
    const stepsCompleted = snapshot.steps.filter((s) => states[s.id]?.state === "DONE").length;

    const skillMap = new Map<string, { name: string; total: number; done: number }>();
    for (const step of snapshot.steps) {
      for (const skill of step.puzzle?.skills ?? []) {
        const e = skillMap.get(skill.id) ?? { name: skill.name, total: 0, done: 0 };
        e.total += 1;
        if (states[step.id]?.state === "DONE") e.done += 1;
        skillMap.set(skill.id, e);
      }
    }
    const skills = [...skillMap.values()].map((v) => ({ name: v.name, validated: v.total > 0 && v.done === v.total }));
    for (const s of skills) {
      const agg = skillTotals.get(s.name) ?? { validated: 0, total: 0 };
      agg.total += 1;
      if (s.validated) agg.validated += 1;
      skillTotals.set(s.name, agg);
    }

    const entry: LeaderboardEntry = {
      actorId: p.id,
      name: p.team?.name ?? p.player?.displayName ?? "Participant",
      score: p.score,
      stepsCompleted,
      skillsValidated: skills.filter((s) => s.validated).length,
      hintsUsed: p.hintsUsed,
      wrongAnswers: p.wrongAnswers,
      timeSpentSeconds: p.timeSpentSeconds,
      completed: p.status === "COMPLETED",
    };
    entries.push(entry);

    return {
      ...entry,
      progressId: p.id,
      members: p.team ? p.team.members.map((m) => m.player.displayName) : p.player ? [p.player.displayName] : [],
      badges: p.badges.map((b) => b.badge.name),
      skills,
      status: p.status,
    };
  });

  const ranked = rankEntries(entries, (snapshot.settings.leaderboardMethod as LeaderboardMethod) ?? "PEDAGOGICAL");
  const rankById = new Map(ranked.map((r) => [r.actorId, r.rank]));
  const rows: ResultRow[] = rowsRaw.map((r) => ({ ...r, rank: rankById.get(r.progressId) ?? 0 })).sort((a, b) => a.rank - b.rank);

  const participants = rowsRaw.length;
  const completed = rowsRaw.filter((r) => r.completed).length;
  const abandoned = rowsRaw.filter((r) => r.status === "ABANDONED" || r.status === "TIMED_OUT").length;
  const scores = rowsRaw.map((r) => r.score);
  const times = rowsRaw.filter((r) => r.timeSpentSeconds > 0).map((r) => r.timeSpentSeconds);

  const steps = snapshot.steps.map((s) => {
    let completedCount = 0;
    let attempts = 0;
    let wrong = 0;
    let hints = 0;
    const hintIds = new Set((s.puzzle?.hints ?? []).map((h) => h.id));
    for (const p of session.progresses) {
      const states = readStepStates(p.stepStates);
      if (states[s.id]?.state === "DONE") completedCount += 1;
      attempts += states[s.id]?.attempts ?? 0;
      wrong += states[s.id]?.wrongAttempts ?? 0;
      hints += p.hintRequests.filter((h) => hintIds.has(h.hintId)).length;
    }
    return {
      id: s.id,
      title: s.title,
      completed: completedCount,
      attempts,
      wrong,
      hints,
      successRate: participants ? Math.round((completedCount / participants) * 100) : 0,
      averageAttempts: completedCount ? Math.round((attempts / Math.max(1, completedCount)) * 10) / 10 : 0,
    };
  });

  return {
    session: {
      id: session.id,
      code: session.code,
      status: session.status,
      mode: session.mode,
      gameId: session.gameId,
      gameTitle: snapshot.title,
      leaderboardMethod: snapshot.settings.leaderboardMethod,
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    },
    rows,
    summary: {
      participants,
      completionRate: participants ? Math.round((completed / participants) * 100) : 0,
      averageScore: participants ? Math.round(scores.reduce((a, b) => a + b, 0) / participants) : 0,
      medianScore: median(scores),
      averageTimeSeconds: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
      abandonRate: participants ? Math.round((abandoned / participants) * 100) : 0,
      hintRate: participants ? Math.round((rowsRaw.reduce((a, r) => a + r.hintsUsed, 0) / participants) * 10) / 10 : 0,
    },
    steps,
    skills: [...skillTotals.entries()].map(([name, v]) => ({ name, validated: v.validated, total: v.total, rate: v.total ? Math.round((v.validated / v.total) * 100) : 0 })).sort((a, b) => a.rate - b.rate),
  };
}

/** Statistiques agrégées d'un Escape Game sur toutes ses sessions. */
export async function getGameStats(gameId: string) {
  const sessions = await prisma.gameSession.findMany({ where: { gameId }, select: { id: true, code: true, createdAt: true, status: true } });
  const all = await Promise.all(sessions.map((s) => getSessionResults(s.id)));
  const valid = all.filter((r): r is SessionResults => r !== null);

  const participants = valid.reduce((a, r) => a + r.summary.participants, 0);
  const weighted = (pick: (r: SessionResults) => number) =>
    participants ? Math.round(valid.reduce((a, r) => a + pick(r) * r.summary.participants, 0) / participants) : 0;

  const stepMap = new Map<string, { title: string; completed: number; attempts: number; wrong: number; hints: number; participants: number }>();
  for (const r of valid) {
    for (const s of r.steps) {
      const e = stepMap.get(s.title) ?? { title: s.title, completed: 0, attempts: 0, wrong: 0, hints: 0, participants: 0 };
      e.completed += s.completed;
      e.attempts += s.attempts;
      e.wrong += s.wrong;
      e.hints += s.hints;
      e.participants += r.summary.participants;
      stepMap.set(s.title, e);
    }
  }
  const skillMap = new Map<string, { validated: number; total: number }>();
  for (const r of valid) {
    for (const s of r.skills) {
      const e = skillMap.get(s.name) ?? { validated: 0, total: 0 };
      e.validated += s.validated;
      e.total += s.total;
      skillMap.set(s.name, e);
    }
  }

  return {
    sessions: valid.map((r, i) => ({
      id: r.session.id,
      code: r.session.code,
      createdAt: sessions[i]?.createdAt ?? new Date(),
      status: r.session.status,
      participants: r.summary.participants,
      completionRate: r.summary.completionRate,
      averageScore: r.summary.averageScore,
      averageTimeSeconds: r.summary.averageTimeSeconds,
    })),
    totals: {
      sessions: valid.length,
      participants,
      completionRate: weighted((r) => r.summary.completionRate),
      averageScore: weighted((r) => r.summary.averageScore),
      averageTimeSeconds: weighted((r) => r.summary.averageTimeSeconds),
      abandonRate: weighted((r) => r.summary.abandonRate),
      hintRate: participants ? Math.round((valid.reduce((a, r) => a + r.summary.hintRate * r.summary.participants, 0) / participants) * 10) / 10 : 0,
    },
    steps: [...stepMap.values()].map((s) => ({
      ...s,
      successRate: s.participants ? Math.round((s.completed / s.participants) * 100) : 0,
    })).sort((a, b) => a.successRate - b.successRate),
    skills: [...skillMap.entries()].map(([name, v]) => ({ name, validated: v.validated, total: v.total, rate: v.total ? Math.round((v.validated / v.total) * 100) : 0 })).sort((a, b) => a.rate - b.rate),
  };
}
