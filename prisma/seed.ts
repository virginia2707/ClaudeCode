import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  console.log(`Comptes de démonstration : ${DEMO_ACCOUNTS.map((a) => a.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
