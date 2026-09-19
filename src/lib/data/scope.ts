import "server-only";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Cloisonnement multi-tenant.
//
// Toute lecture ou écriture métier passe par un `OrgScope`. Une requête Prisma
// écrite « à la main » sans `organizationId` est un défaut de sécurité : ces
// helpers rendent le périmètre explicite et impossible à oublier.
// ─────────────────────────────────────────────────────────────────────────────

export type OrgScope = { organizationId: string; userId: string };

export class NotInScopeError extends Error {
  readonly status = 404;
  constructor(entity: string, id: string) {
    super(`NOT_IN_SCOPE:${entity}:${id}`);
  }
}

/** Charge une mission en garantissant qu'elle appartient à l'organisation. */
export async function missionInScope(scope: OrgScope, missionId: string) {
  const mission = await prisma.mission.findFirst({
    where: { id: missionId, organizationId: scope.organizationId },
  });
  if (!mission) throw new NotInScopeError("Mission", missionId);
  return mission;
}

/** Charge une compétence modifiable : celles de l'organisation uniquement.
 *  Les compétences de la bibliothèque globale (organizationId null) sont
 *  lisibles par tous mais ne peuvent être ni modifiées ni supprimées. */
export async function editableSkillInScope(scope: OrgScope, skillId: string) {
  const skill = await prisma.skill.findFirst({
    where: { id: skillId, organizationId: scope.organizationId },
  });
  if (!skill) throw new NotInScopeError("Skill", skillId);
  return skill;
}
