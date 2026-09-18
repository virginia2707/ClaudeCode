import type { OwnedGame } from "@/lib/games/queries";

export type PublishIssue = { level: "error" | "warning"; message: string; stepId?: string };

/** Règles de validation avant publication. Les erreurs bloquent, les avertissements informent. */
export function validateForPublish(game: OwnedGame): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!game.title.trim()) issues.push({ level: "error", message: "Le titre est obligatoire." });
  if (!game.scenario.trim()) issues.push({ level: "warning", message: "Aucun scénario : les apprenants n'auront pas de contexte." });
  if (game.steps.length === 0) issues.push({ level: "error", message: "Ajoutez au moins une étape." });
  if (game.steps.length > 0 && !game.steps.some((s) => s.isFinal)) {
    issues.push({ level: "warning", message: "Aucune étape n'est marquée comme mission finale : la dernière étape sera utilisée." });
  }
  for (const step of game.steps) {
    const label = `Étape ${step.order + 1} « ${step.title || "sans titre"} »`;
    if (!step.puzzle) {
      issues.push({ level: "error", message: `${label} : aucune énigme définie.`, stepId: step.id });
      continue;
    }
    if (!step.puzzle.prompt.trim() && !step.instruction.trim()) {
      issues.push({ level: "error", message: `${label} : la consigne ou l'énoncé de l'énigme est vide.`, stepId: step.id });
    }
    if (step.puzzle.validationMode === "AUTO" && step.puzzle.answers.length === 0) {
      issues.push({ level: "error", message: `${label} : aucune réponse acceptée n'est définie.`, stepId: step.id });
    }
    if (step.puzzle.skills.length === 0) {
      issues.push({ level: "warning", message: `${label} : aucune compétence associée.`, stepId: step.id });
    }
  }
  const settings = game.settings;
  if (settings && settings.timerMode !== "NONE" && (!settings.maxMinutes || settings.maxMinutes <= 0)) {
    issues.push({ level: "error", message: "Le chronomètre est activé mais la durée maximale est vide." });
  }
  return issues;
}

export function hasBlockingIssues(issues: PublishIssue[]) {
  return issues.some((i) => i.level === "error");
}
