// Seed: demo accounts (+ demo quiz from Phase 3 onwards). Idempotent.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemoContent } from "./seed-demo";

const prisma = new PrismaClient();

export const DEMO_ACCOUNTS = [
  { email: "admin@quizarena.dev", name: "Admin QuizArena", role: "ADMIN", password: "Admin1234!" },
  { email: "formateur@quizarena.dev", name: "Camille Formatrice", role: "TRAINER", password: "Formateur1234!" },
  { email: "apprenant@quizarena.dev", name: "Alex Apprenant", role: "LEARNER", password: "Apprenant1234!" },
] as const;

async function main() {
  for (const account of DEMO_ACCOUNTS) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, role: account.role },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        plan: account.role === "LEARNER" ? "FREE" : "PRO",
        passwordHash: await bcrypt.hash(account.password, 10),
      },
    });
  }
  await seedDemoContent(prisma);
  console.log("Seed complete: demo accounts ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
