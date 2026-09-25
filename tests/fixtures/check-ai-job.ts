// Vérifie qu'une tâche IA est journalisée, terminée et rattachée au jeu créé.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const job = await prisma.aIJob.findFirst({ orderBy: { createdAt: "desc" } });
  if (!job) throw new Error("Aucune tâche IA enregistrée");
  if (job.status !== "DONE") throw new Error(`Statut inattendu : ${job.status}`);
  if (!job.provider) throw new Error("Fournisseur non enregistré");
  if (!job.gameId) throw new Error("Tâche non rattachée au jeu généré");
  if (!job.output) throw new Error("Sortie non enregistrée");
  console.log(`AI job ok (provider=${job.provider}, game=${job.gameId})`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
