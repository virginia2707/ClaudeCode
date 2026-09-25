import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SYSTEM_BADGES } from "../src/lib/engine/badges";
import { createDemoGame } from "../src/lib/demo/excel-demo";

const prisma = new PrismaClient();

const DEMO_ACCOUNTS = [
  { email: "admin@escapeclass.dev", password: "Admin1234!", firstName: "Alex", lastName: "Admin", role: "ADMIN", plan: "ENTERPRISE" },
  { email: "formateur@escapeclass.dev", password: "Formateur1234!", firstName: "Camille", lastName: "Formatrice", role: "TRAINER", plan: "PRO" },
  { email: "apprenant@escapeclass.dev", password: "Apprenant1234!", firstName: "Sam", lastName: "Apprenant", role: "LEARNER", plan: "FREE" },
];

async function main() {
  for (const a of DEMO_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(a.password, 10);
    await prisma.user.upsert({
      where: { email: a.email },
      update: { passwordHash, firstName: a.firstName, lastName: a.lastName, role: a.role, plan: a.plan, isActive: true },
      create: { email: a.email, passwordHash, firstName: a.firstName, lastName: a.lastName, role: a.role, plan: a.plan },
    });
  }
  // Badges système, communs à tous les Escape Games.
  for (const badge of SYSTEM_BADGES) {
    const existing = await prisma.badge.findFirst({ where: { code: badge.code, gameId: null, isSystem: true } });
    if (existing) {
      await prisma.badge.update({ where: { id: existing.id }, data: { ...badge, isSystem: true } });
    } else {
      await prisma.badge.create({ data: { ...badge, isSystem: true } });
    }
  }

  const trainer = await prisma.user.findUnique({ where: { email: "formateur@escapeclass.dev" }, select: { id: true } });
  if (trainer) {
    const demoId = await createDemoGame(trainer.id);
    console.log(`Démo « Mission Excel — Le reporting disparu » : ${demoId}`);
  }

  console.log(`Comptes de démonstration : ${DEMO_ACCOUNTS.map((a) => a.email).join(", ")}`);
  console.log(`Badges système : ${SYSTEM_BADGES.map((b) => b.code).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
