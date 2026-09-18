// Comptes de démonstration (phase 2). La mission de démonstration complète
// est ajoutée à ce seed en phase 19.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const DEMO_ACCOUNTS = [
  { email: "admin@missionia.dev", name: "Alice Admin", password: "Admin1234!", role: "ADMIN" },
  { email: "formateur@missionia.dev", name: "Farid Formateur", password: "Formateur1234!", role: "TRAINER" },
  { email: "apprenant@missionia.dev", name: "Léa Apprenante", password: "Apprenant1234!", role: "LEARNER" },
] as const;

// Comptes réservés aux tests automatisés qui modifient des rôles : ils évitent
// de muter les comptes de démonstration. Créés uniquement hors production.
const TEST_ACCOUNTS = [
  { email: "membre-desktop@missionia.dev", name: "Marc Mutable", password: "Membre1234!", role: "LEARNER" },
  { email: "membre-mobile@missionia.dev", name: "Mina Mutable", password: "Membre1234!", role: "LEARNER" },
] as const;

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "novaskills-formation" },
    update: {},
    create: { name: "NovaSkills Formation", slug: "novaskills-formation", plan: "BUSINESS" },
  });
  const accounts = process.env.NODE_ENV === "production" ? DEMO_ACCOUNTS : [...DEMO_ACCOUNTS, ...TEST_ACCOUNTS];
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, passwordHash },
      create: { email: account.email, name: account.name, passwordHash },
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: { role: account.role, status: "ACTIVE" },
      create: { userId: user.id, organizationId: org.id, role: account.role },
    });
  }
  console.log(`Seed OK — organisation "${org.name}" et ${accounts.length} comptes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
