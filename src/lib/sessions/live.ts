import "server-only";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/json";
import { readSnapshot } from "@/lib/sessions/snapshot";
import { readStepStates } from "@/lib/engine/progress";
import { timerFor } from "@/lib/sessions/engine-runner";
import { rankEntries, type LeaderboardEntry } from "@/lib/engine/leaderboard";
import type { LeaderboardMethod } from "@/lib/constants";

export type LiveActor = {
  progressId: string;
  name: string;
  members: string[];
  status: string;
  score: number;
  stepsCompleted: number;
  stepsTotal: number;
  currentStepTitle: string | null;
  currentStepId: string | null;
  hintsUsed: number;
  wrongAnswers: number;
  stuck: boolean;
  online: boolean;
  rank: number;
  pendingAnswers: { id: string; stepTitle: string; submitted: string; createdAt: string }[];
};

export type LiveState = {
  session: {
    id: string;
    code: string;
    status: string;
    mode: string;
    joinUrl: string;
    gameTitle: string;
    pauseAllowed: boolean;
    leaderboardMethod: string;
    stepTitles: { id: string; title: string }[];
  };
  timer: { remainingSeconds: number | null; elapsedSeconds: number; endsAt: string | null; expired: boolean; paused: boolean; serverNow: string };
  stats: { participants: number; online: number; started: number; completed: number; averageScore: number; averagePercent: number; hintsUsed: number };
  actors: LiveActor[];
  stepStats: { id: string; title: string; completed: number; attempts: number; wrong: number; hints: number }[];
};

/** Vue temps réel consolidée pour l'écran formateur. */
export async function getLiveState(sessionId: string, joinBaseUrl: string): Promise<LiveState | null> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      players: { include: { teamMembership: { include: { team: true } } } },
      progresses: {
        include: {
          player: true,
          team: { include: { members: { include: { player: true } } } },
          hintRequests: true,
          answers: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!session) return null;

  const snapshot = readSnapshot(session.gameSnapshot);
  const timer = timerFor(session, snapshot);
  const stepTitleById = new Map(snapshot.steps.map((s) => [s.id, s.title]));
  const now = Date.now();

  const entries: LeaderboardEntry[] = [];
  const actorsRaw = session.progresses.map((p) => {
    const states = readStepStates(p.stepStates);
    const doneIds = snapshot.steps.filter((s) => states[s.id]?.state === "DONE").map((s) => s.id);
    const currentStepId = snapshot.steps.find((s) => states[s.id]?.state !== "DONE")?.id ?? null;
    const members = p.team ? p.team.members.map((m) => m.player.displayName) : p.player ? [p.player.displayName] : [];
    const online = p.team
      ? p.team.members.some((m) => now - new Date(m.player.lastSeenAt).getTime() < 60000)
      : p.player
        ? now - new Date(p.player.lastSeenAt).getTime() < 60000
        : false;

    // « Bloqué » : au moins 2 erreurs sur l'étape courante, ou aucune réussite depuis 5 minutes.
    const currentState = currentStepId ? states[currentStepId] : null;
    const lastAnswer = p.answers[0];
    const idleSeconds = lastAnswer ? Math.floor((now - new Date(lastAnswer.createdAt).getTime()) / 1000) : 0;
    const stuck = Boolean(
      p.status === "IN_PROGRESS" && ((currentState?.wrongAttempts ?? 0) >= 2 || (lastAnswer && idleSeconds > 300)),
    );

    const skillsValidated = (() => {
      const map = new Map<string, { total: number; done: number }>();
      for (const step of snapshot.steps) {
        for (const skill of step.puzzle?.skills ?? []) {
          const e = map.get(skill.id) ?? { total: 0, done: 0 };
          e.total += 1;
          if (states[step.id]?.state === "DONE") e.done += 1;
          map.set(skill.id, e);
        }
      }
      return [...map.values()].filter((v) => v.total > 0 && v.done === v.total).length;
    })();

    entries.push({
      actorId: p.id,
      name: p.team?.name ?? p.player?.displayName ?? "Participant",
      score: p.score,
      stepsCompleted: doneIds.length,
      skillsValidated,
      hintsUsed: p.hintsUsed,
      wrongAnswers: p.wrongAnswers,
      timeSpentSeconds: p.timeSpentSeconds,
      completed: p.status === "COMPLETED",
    });

    return {
      progressId: p.id,
      name: p.team?.name ?? p.player?.displayName ?? "Participant",
      members,
      status: p.status,
      score: p.score,
      stepsCompleted: doneIds.length,
      stepsTotal: snapshot.steps.length,
      currentStepId,
      currentStepTitle: currentStepId ? (stepTitleById.get(currentStepId) ?? null) : null,
      hintsUsed: p.hintsUsed,
      wrongAnswers: p.wrongAnswers,
      stuck,
      online,
      pendingAnswers: p.answers
        .filter((a) => a.status === "PENDING")
        .map((a) => ({
          id: a.id,
          stepTitle: stepTitleById.get(a.stepId) ?? "",
          submitted: JSON.stringify(parseJson<unknown>(a.submitted, "")),
          createdAt: a.createdAt.toISOString(),
        })),
    };
  });

  const ranked = rankEntries(entries, (snapshot.settings.leaderboardMethod as LeaderboardMethod) ?? "PEDAGOGICAL");
  const rankById = new Map(ranked.map((r) => [r.actorId, r.rank]));
  const actors: LiveActor[] = actorsRaw
    .map((a) => ({ ...a, rank: rankById.get(a.progressId) ?? 0 }))
    .sort((a, b) => a.rank - b.rank);

  const started = actorsRaw.filter((a) => a.status !== "NOT_STARTED").length;
  const completed = actorsRaw.filter((a) => a.status === "COMPLETED").length;
  const averageScore = actorsRaw.length ? Math.round(actorsRaw.reduce((acc, a) => acc + a.score, 0) / actorsRaw.length) : 0;
  const averagePercent =
    actorsRaw.length && snapshot.steps.length
      ? Math.round((actorsRaw.reduce((acc, a) => acc + a.stepsCompleted / snapshot.steps.length, 0) / actorsRaw.length) * 100)
      : 0;

  const stepStats = snapshot.steps.map((s) => {
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
    return { id: s.id, title: s.title, completed: completedCount, attempts, wrong, hints };
  });

  return {
    session: {
      id: session.id,
      code: session.code,
      status: session.status,
      mode: session.mode,
      joinUrl: `${joinBaseUrl}/join/${session.code}`,
      gameTitle: snapshot.title,
      pauseAllowed: snapshot.settings.pauseAllowed,
      leaderboardMethod: snapshot.settings.leaderboardMethod,
      stepTitles: snapshot.steps.map((s) => ({ id: s.id, title: s.title })),
    },
    timer: {
      remainingSeconds: timer.remainingSeconds,
      elapsedSeconds: timer.elapsedSeconds,
      endsAt: timer.endsAt ? timer.endsAt.toISOString() : null,
      expired: timer.expired,
      paused: timer.paused,
      serverNow: new Date().toISOString(),
    },
    stats: {
      participants: session.players.length,
      online: actorsRaw.filter((a) => a.online).length,
      started,
      completed,
      averageScore,
      averagePercent,
      hintsUsed: actorsRaw.reduce((acc, a) => acc + a.hintsUsed, 0),
    },
    actors,
    stepStats,
  };
}
