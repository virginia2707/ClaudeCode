// Fixtures E2E : crée des jeux de test pour le compte formateur de démo (npm run seed au préalable).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const trainer = await prisma.user.findUniqueOrThrow({ where: { email: "formateur@escapeclass.dev" } });
  // Réinitialise tous les jeux du compte de démo pour des compteurs déterministes.
  await prisma.escapeGame.deleteMany({ where: { ownerId: trainer.id } });
  const skill = await prisma.skill.upsert({ where: { ownerId_name: { ownerId: trainer.id, name: "SOMME et calculs" } }, update: {}, create: { ownerId: trainer.id, name: "SOMME et calculs", category: "Excel" } });
  // Jeu valide (publiable)
  await prisma.escapeGame.create({
    data: {
      ownerId: trainer.id, title: "Test — Jeu publiable", slug: "test-publiable", description: "Jeu de test complet.", scenario: "Un scénario.",
      settings: { create: {} },
      steps: { create: [
        { order: 0, title: "Étape A", instruction: "Trouvez le code", unlockCode: "4729", puzzle: { create: { type: "NUMERIC_CODE", prompt: "Quel est le total ?", answers: { create: [{ value: JSON.stringify("4729"), isPrimary: true }] }, skills: { create: [{ skillId: skill.id }] } } } },
        { order: 1, title: "Étape B", instruction: "Mot secret", isFinal: true, puzzle: { create: { type: "SECRET_WORD", prompt: "Quel mot ?", answers: { create: [{ value: JSON.stringify("EXCEL"), isPrimary: true }] } } } },
      ] },
    },
  });
  // Jeu invalide (sans étape)
  await prisma.escapeGame.create({ data: { ownerId: trainer.id, title: "Test — Jeu vide", slug: "test-vide", settings: { create: {} } } });
  // Jeu archivé
  await prisma.escapeGame.create({ data: { ownerId: trainer.id, title: "Test — Jeu archivé", slug: "test-archive", status: "ARCHIVED", settings: { create: {} } } });
  console.log("test games seeded");
}
main().finally(() => prisma.$disconnect());
