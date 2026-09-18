// Fixtures E2E : crée des jeux de test pour le compte formateur de démo (npm run seed au préalable).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const trainer = await prisma.user.findUniqueOrThrow({ where: { email: "formateur@escapeclass.dev" } });
  // Réinitialise tous les jeux du compte de démo pour des compteurs déterministes.
  await prisma.escapeGame.deleteMany({ where: { ownerId: trainer.id } });

  const skill = await prisma.skill.upsert({
    where: { ownerId_name: { ownerId: trainer.id, name: "SOMME et calculs" } },
    update: {},
    create: { ownerId: trainer.id, name: "SOMME et calculs", category: "Excel" },
  });
  const skill2 = await prisma.skill.upsert({
    where: { ownerId_name: { ownerId: trainer.id, name: "Recherche de données" } },
    update: {},
    create: { ownerId: trainer.id, name: "Recherche de données", category: "Excel" },
  });

  // Jeu valide et jouable de bout en bout : 2 étapes, indices, compétences.
  await prisma.escapeGame.create({
    data: {
      ownerId: trainer.id,
      title: "Test — Jeu publiable",
      slug: "test-publiable",
      description: "Jeu de test complet.",
      scenario: "Un scénario de test.",
      estimatedMinutes: 30,
      settings: { create: { maxMinutes: 30, timerMode: "GLOBAL" } },
      steps: {
        create: [
          {
            order: 0,
            title: "Étape A",
            instruction: "Trouvez le code",
            unlockCode: "4729",
            points: 100,
            recommendedSeconds: 300,
            successFeedback: "Bonne réponse, le total est correct.",
            errorFeedback: "Ce n'est pas le bon total, vérifiez la colonne.",
            explanation: "La fonction SOMME additionne une plage de cellules.",
            puzzle: {
              create: {
                type: "NUMERIC_CODE",
                prompt: "Quel est le total ?",
                config: JSON.stringify({ digits: null, tolerance: 0 }),
                answers: { create: [{ value: JSON.stringify("4729"), isPrimary: true }] },
                skills: { create: [{ skillId: skill.id }] },
                hints: {
                  create: [
                    { order: 0, text: "Regardez la colonne Total.", pointCost: 10, timeCostSeconds: 0 },
                    { order: 1, text: "Utilisez la formule SOMME.", pointCost: 20, timeCostSeconds: 0 },
                  ],
                },
              },
            },
          },
          {
            order: 1,
            title: "Étape B",
            instruction: "Mot secret",
            isFinal: true,
            points: 100,
            recommendedSeconds: 300,
            successFeedback: "Mission accomplie.",
            puzzle: {
              create: {
                type: "SECRET_WORD",
                prompt: "Quel mot ?",
                answers: { create: [{ value: JSON.stringify("EXCEL"), isPrimary: true }] },
                skills: { create: [{ skillId: skill2.id }] },
              },
            },
          },
        ],
      },
    },
  });

  // Jeu invalide (sans étape) et jeu archivé, pour les tests du dashboard.
  await prisma.escapeGame.create({ data: { ownerId: trainer.id, title: "Test — Jeu vide", slug: "test-vide", settings: { create: {} } } });
  await prisma.escapeGame.create({ data: { ownerId: trainer.id, title: "Test — Jeu archivé", slug: "test-archive", status: "ARCHIVED", settings: { create: {} } } });

  console.log("test games seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
