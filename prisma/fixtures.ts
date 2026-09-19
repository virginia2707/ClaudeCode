// Jeux de données pour les tests automatisés uniquement (jamais en production).
// Ils donnent au tableau de bord et à la liste des missions de quoi être
// réellement testés avant que le Mission Builder n'existe (phases 4 et 5).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type RichMissionInput = { title: string; status: string; skillId: string; orgId: string; authorId: string };

/** Mission complète : étapes, ressource, données, livrable, grille, décision
 *  branchée. Le nécessaire pour tester la copie profonde et l'affichage. */
async function createRichMission({ title, status, skillId, orgId, authorId }: RichMissionInput) {
  const mission = await prisma.mission.create({
    data: {
      organizationId: orgId,
      createdById: authorId,
      title,
      description: "Construire une stratégie de lancement B2B sous contrainte de budget et de délai.",
      sector: "Marketing B2B",
      jobTitle: "Responsable marketing",
      level: "INTERMEDIATE",
      difficulty: "INTERMEDIATE",
      durationMinutes: 60,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      expectedOutcome: "Un plan de lancement à 30 jours finançable et argumenté.",
      scenario: {
        create: {
          companyName: "NovaTech",
          setting: "Siège de NovaTech",
          context: "Lancement de NovaFlow, logiciel B2B de pilotage des opérations.",
          problem: "Budget limité, données clients incomplètes, équipe réduite.",
          stakes: "La direction attend une recommandation demain matin.",
          timeframe: "48 heures",
          briefing: "Vous êtes responsable marketing de NovaTech…",
        },
      },
      learnerRole: { create: { title: "Responsable marketing", department: "Marketing", reportsTo: "Direction générale" } },
      constraints: {
        create: [
          { key: "budget", label: "Budget maximum", type: "BUDGET", operator: "MAX", value: 30000, unit: "€", order: 0 },
          { key: "hours", label: "Délai", type: "TIME", operator: "MAX", value: 48, unit: "h", order: 1 },
        ],
      },
      skills: { create: [{ skillId, weight: 1 }] },
    },
  });

  const s1 = await prisma.missionStep.create({
    data: { missionId: mission.id, order: 0, key: "s1", title: "Analyser les données du marché", stepType: "ANALYSIS", successCriteria: "Identifie le segment majoritaire." },
  });
  const s2 = await prisma.missionStep.create({ data: { missionId: mission.id, order: 1, key: "s2", title: "Choisir une stratégie de lancement", stepType: "DECISION" } });
  const s3 = await prisma.missionStep.create({ data: { missionId: mission.id, order: 2, key: "s3", title: "Produire la recommandation finale", stepType: "DOCUMENT", isLocked: true } });

  const resource = await prisma.resource.create({
    data: { missionId: mission.id, stepId: s1.id, title: "Étude de marché Q2", type: "TEXT", content: "62 % des opportunités proviennent des PME industrielles.", isRequired: true },
  });
  await prisma.dataSet.create({
    data: {
      missionId: mission.id,
      stepId: s1.id,
      title: "Pipeline commercial",
      columnsJson: JSON.stringify([{ key: "segment", label: "Segment" }, { key: "deals", label: "Opportunités" }]),
      rowsJson: JSON.stringify([{ segment: "PME industrielles", deals: 62 }, { segment: "Grands comptes", deals: 23 }]),
      anomaliesJson: JSON.stringify(["Le segment Grands comptes est surévalué de 12 %."]),
    },
  });
  await prisma.stepSkill.create({ data: { stepId: s1.id, skillId } });

  const deliverable = await prisma.deliverable.create({
    data: { stepId: s3.id, title: "Plan de lancement à 30 jours", format: "ACTION_PLAN", submissionMode: "TEXT", isFinal: true },
  });
  await prisma.evaluationCriteria.create({
    data: { deliverableId: deliverable.id, label: "Faisabilité", maxPoints: 20, rubricJson: JSON.stringify([{ points: 20, label: "Excellente" }]) },
  });
  await prisma.evaluationCriteria.create({ data: { missionId: mission.id, label: "Justification", maxPoints: 10 } });

  const decision = await prisma.decision.create({ data: { stepId: s2.id, title: "Répartition du budget", prompt: "Où concentrez-vous l'essentiel du budget ?" } });
  const optionA = await prisma.decisionOption.create({
    data: { decisionId: decision.id, order: 0, label: "A", text: "LinkedIn Ads ciblés", costsJson: JSON.stringify({ budget: 26000 }), quality: "OPTIMAL", scoreDelta: 20 },
  });
  const optionB = await prisma.decisionOption.create({
    data: { decisionId: decision.id, order: 1, label: "B", text: "Campagne d'influence", costsJson: JSON.stringify({ budget: 38000 }), quality: "POOR", scoreDelta: 5 },
  });
  await prisma.decisionOutcome.create({ data: { optionId: optionA.id, consequenceText: "Les premiers leads qualifiés arrivent.", nextStepId: s3.id, unlockStepId: s3.id } });
  await prisma.decisionOutcome.create({
    data: { optionId: optionB.id, consequenceText: "Budget dépassé de 8 000 €.", penaltyPoints: 5, revealResourceId: resource.id, nextStepId: s2.id },
  });

  return mission;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Les fixtures ne doivent jamais être chargées en production.");

  const org = await prisma.organization.findUnique({ where: { slug: "novaskills-formation" } });
  const author = await prisma.user.findUnique({ where: { email: "formateur@missionia.dev" } });
  if (!org || !author) throw new Error("Lancez d'abord `npm run seed`.");

  const existing = await prisma.mission.count({ where: { organizationId: org.id } });
  if (existing > 0) {
    console.log("Fixtures déjà présentes.");
    return;
  }

  const skill = await prisma.skill.create({
    data: { organizationId: org.id, name: "Segmentation client", slug: "segmentation-client", category: "Analyse" },
  });
  const common = { skillId: skill.id, orgId: org.id, authorId: author.id };

  // Missions partagées, jamais modifiées par les tests.
  await createRichMission({ ...common, title: "48 heures pour lancer le produit", status: "PUBLISHED" });
  await prisma.mission.create({
    data: {
      organizationId: org.id,
      createdById: author.id,
      title: "Gérer un conflit dans une équipe",
      description: "Deux collaborateurs en conflit, un projet à livrer dans 10 jours.",
      sector: "Management",
      jobTitle: "Manager d'équipe",
      difficulty: "ADVANCED",
      durationMinutes: 45,
      status: "DRAFT",
    },
  });
  await prisma.mission.create({
    data: {
      organizationId: org.id,
      createdById: author.id,
      title: "Ancienne mission de recrutement",
      description: "Version 2024, remplacée.",
      sector: "Ressources humaines",
      jobTitle: "Chargé de recrutement",
      durationMinutes: 30,
      status: "ARCHIVED",
    },
  });

  // Un bac à sable par projet Playwright : archivage, duplication et
  // suppression s'y déroulent sans interférer d'un projet à l'autre.
  for (const project of ["desktop", "mobile"]) {
    await createRichMission({ ...common, title: `Bac à sable ${project}`, status: "DRAFT" });
  }

  console.log("Fixtures de test chargées : 5 missions.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
