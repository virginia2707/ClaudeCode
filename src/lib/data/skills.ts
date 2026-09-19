import "server-only";
import { prisma } from "@/lib/prisma";
import { editableSkillInScope, type OrgScope } from "@/lib/data/scope";
import { slugify } from "@/lib/auth/slug";

/** Compétences de l'organisation + bibliothèque globale (lecture seule). */
export async function listSkills(scope: OrgScope) {
  const [own, global] = await Promise.all([
    prisma.skill.findMany({
      where: { organizationId: scope.organizationId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { _count: { select: { missionSkills: true } } },
    }),
    prisma.skill.findMany({ where: { organizationId: null }, orderBy: { name: "asc" } }),
  ]);
  return { own, global };
}

export async function createSkill(scope: OrgScope, input: { name: string; description?: string; category?: string }) {
  const base = slugify(input.name);
  let slug = base;
  for (let i = 2; i < 30; i++) {
    const exists = await prisma.skill.findFirst({ where: { organizationId: scope.organizationId, slug }, select: { id: true } });
    if (!exists) break;
    slug = `${base}-${i}`;
  }
  return prisma.skill.create({
    data: {
      organizationId: scope.organizationId,
      name: input.name,
      slug,
      description: input.description || null,
      category: input.category || null,
    },
  });
}

export async function updateSkill(scope: OrgScope, skillId: string, input: { name: string; description?: string; category?: string }) {
  const skill = await editableSkillInScope(scope, skillId);
  return prisma.skill.update({
    where: { id: skill.id },
    data: { name: input.name, description: input.description || null, category: input.category || null },
  });
}

/** Suppression refusée si la compétence est utilisée par une mission ou une étape. */
export async function deleteSkill(scope: OrgScope, skillId: string) {
  const skill = await editableSkillInScope(scope, skillId);
  const [inMissions, inSteps] = await Promise.all([
    prisma.missionSkill.count({ where: { skillId: skill.id } }),
    prisma.stepSkill.count({ where: { skillId: skill.id } }),
  ]);
  if (inMissions + inSteps > 0) return { deleted: false as const, usedBy: inMissions + inSteps };
  await prisma.skill.delete({ where: { id: skill.id } });
  return { deleted: true as const };
}

/** Copie une compétence de la bibliothèque globale dans l'organisation. */
export async function importGlobalSkill(scope: OrgScope, skillId: string) {
  const source = await prisma.skill.findFirst({ where: { id: skillId, organizationId: null } });
  if (!source) return null;
  const exists = await prisma.skill.findFirst({ where: { organizationId: scope.organizationId, slug: source.slug }, select: { id: true } });
  if (exists) return null;
  return prisma.skill.create({
    data: { organizationId: scope.organizationId, name: source.name, slug: source.slug, description: source.description, category: source.category },
  });
}
