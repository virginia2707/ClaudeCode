import type { PrismaClient } from "@prisma/client";

export const DEMO_QUIZ_TITLE = "Les fondamentaux de l'IA";

type DemoQuestion = {
  text: string;
  answers: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
  category: string;
  skills: string[];
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  timeLimit?: number;
};

export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    text: "Qu'est-ce qu'un LLM (Large Language Model) ?",
    answers: [
      "Un modèle statistique entraîné sur de grandes quantités de texte pour prédire et générer du langage",
      "Une base de données qui stocke toutes les pages web",
      "Un programme qui traduit uniquement d'une langue à une autre",
      "Un moteur de recherche amélioré par des filtres",
    ],
    correct: 0,
    explanation: "Un LLM est un réseau de neurones entraîné sur d'immenses corpus de texte. Il apprend des régularités statistiques du langage et génère du texte en prédisant la suite la plus probable.",
    category: "LLM",
    skills: ["Culture IA"],
    difficulty: "EASY",
  },
  {
    text: "En prompt engineering, quelle pratique améliore le plus la qualité d'une réponse ?",
    answers: [
      "Écrire le prompt en majuscules",
      "Donner le contexte, le rôle attendu, le format de sortie et un exemple",
      "Poser la question le plus brièvement possible",
      "Répéter la même question trois fois",
    ],
    correct: 1,
    explanation: "Un bon prompt précise le contexte, le rôle, la tâche, le format attendu et, si possible, un exemple. Plus l'intention est explicite, plus la réponse est pertinente.",
    category: "Prompt engineering",
    skills: ["Prompt engineering"],
    difficulty: "EASY",
  },
  {
    text: "Qu'appelle-t-on une « hallucination » d'un modèle de langage ?",
    answers: [
      "Une réponse trop longue",
      "Une panne du serveur qui héberge le modèle",
      "Une réponse formulée avec assurance mais factuellement fausse ou inventée",
      "Une réponse dans une autre langue que celle demandée",
    ],
    correct: 2,
    explanation: "Une hallucination est une information plausible mais inexacte ou inventée. Elle impose de vérifier les faits, les chiffres et les sources produits par un modèle.",
    category: "Hallucinations",
    skills: ["Esprit critique"],
    difficulty: "EASY",
  },
  {
    text: "Quel réflexe limite le risque lié aux hallucinations dans un usage professionnel ?",
    answers: [
      "Demander au modèle s'il est sûr de lui",
      "Vérifier les informations critiques auprès de sources fiables avant de les utiliser",
      "Utiliser uniquement des prompts courts",
      "Augmenter la température du modèle",
    ],
    correct: 1,
    explanation: "Le modèle peut affirmer avec assurance une erreur. La vérification humaine des éléments critiques (faits, chiffres, références) reste indispensable.",
    category: "Hallucinations",
    skills: ["Esprit critique"],
    difficulty: "MEDIUM",
  },
  {
    text: "Qu'est-ce qui distingue un « agent IA » d'un simple chatbot ?",
    answers: [
      "Il répond plus vite",
      "Il peut planifier des étapes et utiliser des outils pour accomplir un objectif",
      "Il fonctionne sans modèle de langage",
      "Il ne fait que résumer des documents",
    ],
    correct: 1,
    explanation: "Un agent enchaîne des étapes de raisonnement et des actions (recherche, appel d'API, lecture de fichiers) pour atteindre un objectif, là où un chatbot se limite à répondre.",
    category: "Agents IA",
    skills: ["Automatisation"],
    difficulty: "MEDIUM",
  },
  {
    text: "Dans un projet d'automatisation avec IA, quelle tâche est la mieux adaptée ?",
    answers: [
      "Une décision juridique finale sans relecture",
      "Le tri et la pré-qualification de demandes entrantes avec validation humaine",
      "La signature de contrats",
      "La gestion des mots de passe de l'entreprise",
    ],
    correct: 1,
    explanation: "Les tâches répétitives, à volume élevé et à faible risque, avec un humain dans la boucle pour valider, sont les meilleures candidates à l'automatisation.",
    category: "Automatisation",
    skills: ["Automatisation"],
    difficulty: "MEDIUM",
  },
  {
    text: "Pourquoi la qualité des données est-elle déterminante pour un système d'IA ?",
    answers: [
      "Parce que le modèle reproduit les biais et erreurs présents dans ses données",
      "Parce que les données coûtent cher à stocker",
      "Parce que les modèles ne fonctionnent qu'avec des données en anglais",
      "Parce que les données doivent être imprimées",
    ],
    correct: 0,
    explanation: "« Garbage in, garbage out » : des données incomplètes, biaisées ou erronées produisent des résultats biaisés ou faux. La qualité des données conditionne la fiabilité.",
    category: "Données",
    skills: ["Données"],
    difficulty: "MEDIUM",
  },
  {
    text: "Quelle bonne pratique de sécurité s'applique lors de l'usage d'un outil d'IA en ligne ?",
    answers: [
      "Coller des données confidentielles pour obtenir une meilleure réponse",
      "Partager sa clé API dans un document d'équipe",
      "Ne jamais saisir de données personnelles ou confidentielles non autorisées",
      "Désactiver l'authentification pour aller plus vite",
    ],
    correct: 2,
    explanation: "Les données saisies peuvent être stockées ou réutilisées. Il faut respecter la politique de l'organisation et le RGPD : pas de données sensibles sans cadre autorisé.",
    category: "Sécurité",
    skills: ["Sécurité"],
    difficulty: "EASY",
  },
  {
    text: "Qu'est-ce qu'une « injection de prompt » ?",
    answers: [
      "Une technique pour accélérer la génération",
      "Une instruction malveillante cachée dans un contenu pour détourner le comportement du modèle",
      "Un bug d'affichage de l'interface",
      "Une méthode de compression des prompts",
    ],
    correct: 1,
    explanation: "L'injection de prompt consiste à glisser des instructions dans un texte (page web, e-mail, document) que le modèle lit, pour lui faire ignorer ses consignes ou divulguer des données.",
    category: "Sécurité",
    skills: ["Sécurité"],
    difficulty: "HARD",
  },
  {
    text: "Quel gain de productivité est le plus réaliste avec un assistant IA ?",
    answers: [
      "Remplacer entièrement une équipe sans supervision",
      "Accélérer les premiers jets, synthèses et reformulations, avec relecture humaine",
      "Supprimer tout besoin de formation",
      "Garantir des réponses exactes à 100 %",
    ],
    correct: 1,
    explanation: "L'IA excelle pour produire rapidement des brouillons, résumés et variantes. La valeur vient de la relecture et du jugement humain, pas de l'automatisation aveugle.",
    category: "Productivité",
    skills: ["Productivité"],
    difficulty: "MEDIUM",
  },
];

/** Creates (or refreshes) the published demo quiz owned by the demo trainer. Idempotent. */
export async function seedDemoContent(prisma: PrismaClient): Promise<void> {
  const owner = await prisma.user.findUnique({ where: { email: "formateur@quizarena.dev" } });
  if (!owner) throw new Error("Demo trainer account missing — seed accounts first.");

  const existing = await prisma.quiz.findFirst({ where: { ownerId: owner.id, isDemo: true } });
  if (existing) {
    // Keep existing demo quiz (games/results may reference it).
    return;
  }

  const quiz = await prisma.quiz.create({
    data: {
      ownerId: owner.id,
      title: DEMO_QUIZ_TITLE,
      description: "Dix questions pour vérifier les bases : LLM, prompt engineering, hallucinations, agents, automatisation, données, sécurité et productivité.",
      category: "Intelligence artificielle",
      level: "MEDIUM",
      status: "PUBLISHED",
      publishedAt: new Date(),
      isDemo: true,
      settings: JSON.stringify({ timePerQuestion: 20, basePoints: 500, maxSpeedBonus: 500, speedWeight: 1 }),
    },
  });

  for (const [i, q] of DEMO_QUESTIONS.entries()) {
    const skills = await Promise.all(
      q.skills.map((name) =>
        prisma.skill.upsert({ where: { ownerId_name: { ownerId: owner.id, name } }, update: {}, create: { ownerId: owner.id, name } }),
      ),
    );
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        order: i,
        text: q.text,
        explanation: q.explanation,
        category: q.category,
        difficulty: q.difficulty ?? "MEDIUM",
        timeLimit: q.timeLimit ?? 20,
        points: 500,
        answers: { create: q.answers.map((text, ai) => ({ order: ai, text, isCorrect: ai === q.correct })) },
        skills: { create: skills.map((s) => ({ skillId: s.id })) },
      },
    });
  }
  console.log(`Demo quiz « ${DEMO_QUIZ_TITLE} » created with ${DEMO_QUESTIONS.length} questions.`);
}
