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

// Bibliothèque de compétences transverses fournie avec MissionIA
// (organizationId null : lisible par toutes les organisations, non modifiable).
const GLOBAL_SKILLS = [
  { slug: "analyse-de-donnees", name: "Analyse de données", category: "Analyse", description: "Lire des données chiffrées, repérer une tendance et une anomalie." },
  { slug: "prise-de-decision", name: "Prise de décision", category: "Décision", description: "Trancher sous contrainte de temps et d'information incomplète." },
  { slug: "resolution-de-problemes", name: "Résolution de problèmes", category: "Décision", description: "Formuler un problème, produire des options, choisir et justifier." },
  { slug: "communication-ecrite", name: "Communication écrite", category: "Communication", description: "Rédiger un message clair et adapté à son destinataire." },
  { slug: "gestion-budgetaire", name: "Gestion budgétaire", category: "Gestion", description: "Construire et défendre un budget respectant ses contraintes." },
  { slug: "planification", name: "Planification", category: "Gestion", description: "Séquencer des actions dans un délai et avec des ressources données." },
  { slug: "gestion-de-conflit", name: "Gestion de conflit", category: "Management", description: "Traiter un désaccord entre personnes sans dégrader la performance." },
  { slug: "esprit-critique", name: "Esprit critique", category: "Analyse", description: "Évaluer la fiabilité d'une information avant de l'utiliser." },
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
  for (const skill of GLOBAL_SKILLS) {
    const existing = await prisma.skill.findFirst({ where: { organizationId: null, slug: skill.slug } });
    if (existing) {
      await prisma.skill.update({ where: { id: existing.id }, data: { name: skill.name, category: skill.category, description: skill.description } });
    } else {
      await prisma.skill.create({ data: { organizationId: null, ...skill } });
    }
  }

  console.log(`Seed OK — organisation "${org.name}" et ${accounts.length} comptes, ${GLOBAL_SKILLS.length} compétences globales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
