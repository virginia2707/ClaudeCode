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

export class MissionLockedError extends Error {
  readonly status = 409;
  constructor(id: string) {
    super(`MISSION_LOCKED:${id}`);
  }
}

/**
 * Charge une mission modifiable. Une mission publiée est figée : des
 * apprenants peuvent être en train de la jouer, et en changer le contenu sous
 * leurs pieds fausserait leur parcours et leur évaluation. Pour la modifier,
 * il faut la dupliquer ou l'archiver.
 */
export async function editableMissionInScope(scope: OrgScope, missionId: string) {
  const mission = await missionInScope(scope, missionId);
  if (mission.status === "PUBLISHED") throw new MissionLockedError(missionId);
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
