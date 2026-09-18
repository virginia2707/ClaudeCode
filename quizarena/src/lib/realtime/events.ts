// Shared realtime types (server → client). Kept free of server-only imports so
// client components can import them.

export type PlayerView = {
  id: string;
  nickname: string;
  teamId: string | null;
  teamName: string | null;
  score: number;
  streak: number;
  connected: boolean;
  answered: boolean;
  rank: number;
  previousRank: number | null;
};

export type TeamView = { id: string; name: string; color: string; score: number; rank: number };

export type AnswerPublic = { id: string; text: string };

export type QuestionView = {
  gameQuestionId: string;
  index: number;
  total: number;
  text: string;
  imageUrl: string | null;
  answers: AnswerPublic[];
  timeLimit: number; // seconds
  points: number;
  startedAt: number; // epoch ms (server)
  endsAt: number; // epoch ms (server)
};

export type RevealView = {
  gameQuestionId: string;
  correctAnswerId: string;
  explanation: string;
  distribution: Record<string, number>; // answerId → count
  answeredCount: number;
};

export type GameStatePublic = {
  gameId: string;
  code: string;
  status: string;
  mode: "INDIVIDUAL" | "TEAM";
  title: string;
  description: string;
  totalQuestions: number;
  currentIndex: number;
  question: QuestionView | null;
  reveal: RevealView | null;
  players: PlayerView[];
  teams: TeamView[];
  answeredCount: number;
  settings: {
    feedbackEnabled: boolean;
    showExplanation: boolean;
    showLeaderboard: boolean;
    showAnswerDistribution: boolean;
    jokersEnabled: boolean;
  };
  serverTime: number;
};

export type GameEvent =
  | { type: "snapshot"; state: GameStatePublic }
  | { type: "players"; players: PlayerView[]; teams: TeamView[] }
  | { type: "question_started"; question: QuestionView; currentIndex: number; players: PlayerView[]; serverTime: number }
  | { type: "answer_count"; answeredCount: number; playerId: string }
  | { type: "question_ended"; reveal: RevealView; players: PlayerView[]; teams: TeamView[] }
  | { type: "leaderboard"; players: PlayerView[]; teams: TeamView[] }
  | { type: "paused"; }
  | { type: "resumed"; question: QuestionView | null; serverTime: number }
  | { type: "game_finished" }
  | { type: "heartbeat"; serverTime: number };
