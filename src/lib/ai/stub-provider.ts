import type { AIProvider, GeneratedGame, GeneratedStep, GenerationRequest } from "@/lib/ai/types";
import { LEVEL_LABELS } from "@/lib/constants";
import type { Level } from "@/lib/constants";

/**
 * Fournisseur déterministe, hors-ligne et sans clé d'API. Il sert de valeur
 * par défaut : la fonctionnalité « Générer avec l'IA » reste démontrable et
 * testable sans dépendance réseau ni coût.
 */
export class StubAIProvider implements AIProvider {
  readonly name = "stub";

  isAvailable() {
    return true;
  }

  async generateGame(request: GenerationRequest): Promise<GeneratedGame> {
    const skills = splitObjectives(request.objectives, request.subject, request.stepCount);
    const perStepSeconds = Math.max(60, Math.round(((request.durationMinutes * 60) / request.stepCount) * 0.9));
    const steps: GeneratedStep[] = Array.from({ length: request.stepCount }, (_, i) => buildStep(request, skills[i % skills.length], i, perStepSeconds));

    return {
      title: `Mission ${request.subject} — L'enquête`,
      description: `Une mission de ${request.durationMinutes} minutes en ${request.stepCount} étapes pour travailler ${request.subject} au niveau ${LEVEL_LABELS[request.level as Level] ?? request.level}.`,
      scenario:
        `Il est 16h30. Votre équipe doit livrer un dossier « ${request.subject} » avant 17h, mais plusieurs éléments manquent ou sont erronés. ` +
        `Votre mission : retrouver les informations exactes, corriger les erreurs et récupérer le code qui débloque le dossier final.`,
      introduction: `Chaque étape vous pose un problème professionnel concret. Résolvez-le pour obtenir un code et débloquer la suite.`,
      finalMessage: `Dossier reconstitué et transmis à temps. Vous avez mobilisé : ${skills.join(", ")}.`,
      objective: request.objectives || `Maîtriser les fondamentaux de ${request.subject}.`,
      skills,
      steps,
    };
  }
}

function splitObjectives(objectives: string, subject: string, count: number): string[] {
  const parsed = objectives
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (parsed.length > 0) return parsed;
  return Array.from({ length: Math.min(count, 5) }, (_, i) => `${subject} — notion ${i + 1}`);
}

function buildStep(request: GenerationRequest, skill: string, index: number, seconds: number): GeneratedStep {
  const isFinal = index === request.stepCount - 1;
  const code = `${1000 + index * 137 + request.stepCount}`;

  if (isFinal) {
    return {
      title: `Étape ${index + 1} — Mission finale`,
      instruction: `Vous détenez tous les éléments. Choisissez l'action professionnelle correcte pour clôturer le dossier « ${request.subject} ».`,
      content: "",
      puzzleType: "MCQ",
      prompt: `Quelle action clôture correctement le dossier ?`,
      answers: ["Vérifier les données puis transmettre le dossier"],
      choices: [
        "Vérifier les données puis transmettre le dossier",
        "Transmettre immédiatement sans relecture",
        "Reporter la transmission au lendemain",
      ],
      correctChoiceIndexes: [0],
      hints: [`Repensez à l'objectif : ${skill}.`],
      unlockCode: "",
      skill,
      difficulty: request.level === "BEGINNER" ? "EASY" : "MEDIUM",
      points: 120,
      recommendedSeconds: seconds,
      successFeedback: "Dossier clôturé dans les règles. Mission accomplie.",
      errorFeedback: "Cette action ne sécurise pas le dossier. Relisez la consigne.",
      explanation: `La vérification avant transmission est la pratique attendue en situation professionnelle sur ${request.subject}.`,
    };
  }

  const numeric = index % 2 === 0;
  return {
    title: `Étape ${index + 1} — ${skill}`,
    instruction: `Analysez les éléments fournis et déterminez la valeur attendue pour « ${skill} ».`,
    content: `Données de travail :\n- Élément A : ${100 + index * 11}\n- Élément B : ${200 + index * 23}\n- Élément C : ${index * 7}`,
    puzzleType: numeric ? "NUMERIC_CODE" : "SHORT_ANSWER",
    prompt: numeric ? `Quel est le total des éléments A et B ?` : `Quel terme professionnel désigne « ${skill} » ?`,
    answers: numeric ? [String(300 + index * 34)] : [skill],
    choices: [],
    correctChoiceIndexes: [],
    hints: [`Reprenez la définition de ${skill}.`, `Concentrez-vous sur les deux premiers éléments.`],
    unlockCode: code,
    skill,
    difficulty: request.level === "EXPERT" ? "HARD" : request.level === "BEGINNER" ? "EASY" : "MEDIUM",
    points: 100,
    recommendedSeconds: seconds,
    successFeedback: `Correct. Vous avez identifié ${skill}.`,
    errorFeedback: `Ce n'est pas la bonne valeur. Reprenez les données de l'étape.`,
    explanation: `${skill} est mobilisée ici parce qu'elle conditionne la suite du dossier.`,
  };
}
