// Contrats de la couche IA. Aucun appelant ne dépend d'un fournisseur :
// tout passe par `AIService` (src/lib/ai/ai-service.ts).

import type { ActionType } from "@/lib/mission-engine/types";

export type AIContext = {
  organizationId: string;
  userId: string;
  locale?: string;
};

// ── Analyse de cours ────────────────────────────────────────────────────────
export type AnalyzeCourseInput = {
  title: string;
  content: string; // texte déjà extrait et anonymisé
  audience?: string;
  level?: string;
};
export type CourseAnalysis = {
  summary: string;
  concepts: string[];
  skills: { name: string; description: string }[];
  objectives: string[];
  procedures: string[];
  examples: string[];
};

// ── Génération de mission ───────────────────────────────────────────────────
export type GenerateMissionInput = {
  subject: string;
  courseContent: string;
  level: string;
  audience: string;
  durationMinutes: number;
  skills: string[];
  stepCount: number;
  sector?: string;
  mode?: "INDIVIDUAL" | "TEAM";
};

export type GeneratedDecisionOption = {
  label: string;
  text: string;
  costs: Record<string, number>;
  quality: "OPTIMAL" | "ACCEPTABLE" | "RISKY" | "POOR";
  consequence: string;
  feedback: string;
  contextUpdate?: string;
};

export type GeneratedStep = {
  key: string;
  title: string;
  objective: string;
  context: string;
  instruction: string;
  stepType: ActionType;
  estimatedMinutes: number;
  skills: string[];
  successCriteria: string;
  feedbackSuccess: string;
  feedbackFailure: string;
  decision?: { title: string; prompt: string; options: GeneratedDecisionOption[] };
  deliverable?: { title: string; format: string; instructions: string; requiredElements: string[] };
  criteria?: { label: string; description: string; maxPoints: number }[];
  dataset?: { title: string; columns: string[]; rows: (string | number)[][] };
};

export type GeneratedMission = {
  title: string;
  description: string;
  sector: string;
  jobTitle: string;
  objectives: string[];
  expectedOutcome: string;
  scenario: {
    companyName: string;
    setting: string;
    context: string;
    problem: string;
    stakes: string;
    timeframe: string;
    briefing: string;
  };
  learnerRole: { title: string; department: string; reportsTo: string; responsibilities: string };
  constraints: { key: string; label: string; type: string; operator: "MAX" | "MIN" | "EQ"; value: number; unit?: string }[];
  skills: string[];
  steps: GeneratedStep[];
  finalCriteria: { label: string; description: string; maxPoints: number }[];
};

// ── Évaluation assistée ─────────────────────────────────────────────────────
export type EvaluateDeliverableInput = {
  deliverableTitle: string;
  instructions: string;
  requiredElements: string[];
  criteria: { id: string; label: string; description: string; maxPoints: number; rubric?: unknown }[];
  submissionText: string;
  missionContext: string;
};
export type DeliverableEvaluation = {
  scores: { criteriaId: string; points: number; justification: string }[];
  totalScore: number;
  maxScore: number;
  strengths: string[];
  improvements: string[];
  comment: string;
  /** L'IA doit toujours annoncer son incertitude ; le formateur valide. */
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

// ── Coach ───────────────────────────────────────────────────────────────────
export type CoachInput = {
  helpLevel: 1 | 2 | 3 | 4 | 5;
  question: string;
  step: { title: string; objective: string; instruction: string; stepType: ActionType };
  missionRules: string;
  availableResources: string[];
  previousAnswers: string[];
  previousDecisions: string[];
  history: { role: "LEARNER" | "COACH"; content: string }[];
};
export type CoachResponse = {
  content: string;
  helpLevel: number;
  /** true si la réponse a été limitée pour ne pas révéler la solution. */
  withheldSolution: boolean;
};

// ── Feedback & bilan ────────────────────────────────────────────────────────
export type GenerateFeedbackInput = {
  stepTitle: string;
  expected: string;
  learnerOutput: string;
  consequence?: string;
};
export type GeneratedFeedback = {
  kind: "SUCCESS" | "ERROR" | "EXPLANATION" | "CONSEQUENCE" | "RECOMMENDATION";
  content: string;
};

export type LearningReportInput = {
  missionTitle: string;
  score: number;
  maxScore: number;
  skills: { name: string; score: number; max: number }[];
  decisions: { title: string; option: string; quality: string }[];
  deliverables: { title: string; score: number; max: number }[];
  hintsUsed: number;
  timeSpentMinutes: number;
};
export type LearningReport = {
  strengths: string[];
  improvements: string[];
  recommendation: string;
  summary: string;
};

// ── Fournisseur ─────────────────────────────────────────────────────────────
export interface AIProvider {
  readonly name: string;
  analyzeCourse(input: AnalyzeCourseInput, ctx: AIContext): Promise<CourseAnalysis>;
  generateMission(input: GenerateMissionInput, ctx: AIContext): Promise<GeneratedMission>;
  generateScenario(input: GenerateMissionInput, ctx: AIContext): Promise<GeneratedMission["scenario"]>;
  generateSteps(input: GenerateMissionInput & { scenario: GeneratedMission["scenario"] }, ctx: AIContext): Promise<GeneratedStep[]>;
  generateDecision(input: { stepTitle: string; context: string; constraints: string[] }, ctx: AIContext): Promise<NonNullable<GeneratedStep["decision"]>>;
  generateFeedback(input: GenerateFeedbackInput, ctx: AIContext): Promise<GeneratedFeedback>;
  evaluateDeliverable(input: EvaluateDeliverableInput, ctx: AIContext): Promise<DeliverableEvaluation>;
  generateCoachResponse(input: CoachInput, ctx: AIContext): Promise<CoachResponse>;
  generateLearningReport(input: LearningReportInput, ctx: AIContext): Promise<LearningReport>;
}
