// Vérifie l'invariant : le score stocké est toujours la somme du journal d'événements.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const progresses = await prisma.playerProgress.findMany({ include: { scoreEvents: true } });
  const checked = progresses.filter((p) => p.scoreEvents.length > 0);
  const broken = checked.filter((p) => {
    const ledger = Math.max(0, p.scoreEvents.reduce((acc, e) => acc + e.delta, 0));
    return ledger !== p.score;
  });
  if (broken.length > 0) {
    for (const p of broken) {
      const ledger = p.scoreEvents.reduce((acc, e) => acc + e.delta, 0);
      console.error(`Incohérence progression ${p.id} : score=${p.score}, journal=${ledger}`);
    }
    process.exit(1);
  }
  console.log(`score ledger consistent (${checked.length} progression(s) vérifiée(s))`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
