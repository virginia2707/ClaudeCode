import { prisma } from "@/lib/prisma";

/**
 * Crée ou récupère des compétences par nom pour un formateur.
 * Utilisé par l'éditeur d'énigme, la génération IA et l'installation de la démo :
 * volontairement sans dépendance à Next.js pour rester utilisable hors requête
 * (scripts de seed, tâches de maintenance).
 */
export async function ensureSkillsByName(ownerId: string, names: string[]) {
  const out: { id: string; name: string }[] = [];
  for (const rawName of names) {
    const name = rawName.trim().slice(0, 80);
    if (!name) continue;
    const skill = await prisma.skill.upsert({
      where: { ownerId_name: { ownerId, name } },
      update: {},
      create: { ownerId, name },
      select: { id: true, name: true },
    });
    out.push(skill);
  }
  return out;
}
