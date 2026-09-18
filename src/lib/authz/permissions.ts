import type { OrgRole } from "@/lib/constants";

// Matrice rôles → permissions. Le serveur est la seule autorité : chaque
// server action / route handler appelle `assertCan()` avant d'agir, en plus
// du scope organisation. Le frontend ne sert qu'à masquer les actions.

export const PERMISSIONS = [
  // Missions
  "mission:create",
  "mission:read",
  "mission:update",
  "mission:delete",
  "mission:publish",
  "mission:duplicate",
  "mission:generate_ai",
  "mission:import_course",
  // Sessions
  "session:create",
  "session:read",
  "session:manage",
  "session:join",
  // Parcours apprenant
  "progress:play",
  "progress:read_own",
  "progress:read_all",
  // Évaluation
  "evaluation:read_own",
  "evaluation:write",
  "evaluation:validate_ai",
  // Statistiques
  "analytics:read_mission",
  "analytics:read_org",
  // Organisation
  "org:manage_members",
  "org:manage_settings",
  "org:manage_billing",
  // Compétences & badges
  "skill:manage",
  "badge:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const LEARNER: Permission[] = [
  "mission:read",
  "session:read",
  "session:join",
  "progress:play",
  "progress:read_own",
  "evaluation:read_own",
];

const TRAINER: Permission[] = [
  ...LEARNER,
  "mission:create",
  "mission:update",
  "mission:delete",
  "mission:publish",
  "mission:duplicate",
  "mission:generate_ai",
  "mission:import_course",
  "session:create",
  "session:manage",
  "progress:read_all",
  "evaluation:write",
  "evaluation:validate_ai",
  "analytics:read_mission",
  "skill:manage",
  "badge:manage",
];

const ADMIN: Permission[] = [
  ...TRAINER,
  "analytics:read_org",
  "org:manage_members",
  "org:manage_settings",
  "org:manage_billing",
];

export const ROLE_PERMISSIONS: Record<OrgRole, ReadonlySet<Permission>> = {
  LEARNER: new Set(LEARNER),
  TRAINER: new Set(TRAINER),
  ADMIN: new Set(ADMIN),
};

export function can(role: OrgRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(permission: Permission) {
    super(`FORBIDDEN:${permission}`);
  }
}

export function assertCan(role: OrgRole | null | undefined, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(permission);
}
