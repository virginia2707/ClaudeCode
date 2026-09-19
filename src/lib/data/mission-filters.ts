import { MISSION_STATUSES, type MissionStatus } from "@/lib/constants";

// Analyse des paramètres d'URL de la liste des missions. Fonction pure, testée
// isolément : elle ne fait jamais confiance à l'entrée utilisateur.

export const MISSION_SORTS = ["recent", "title", "status"] as const;
export type MissionSort = (typeof MISSION_SORTS)[number];

export const MISSION_SORT_LABELS: Record<MissionSort, string> = {
  recent: "Modifiées récemment",
  title: "Titre (A→Z)",
  status: "Statut",
};

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  DRAFT: "Brouillon",
  IN_REVIEW: "En relecture",
  PUBLISHED: "Publiée",
  ARCHIVED: "Archivée",
};

export type MissionListParams = {
  status: MissionStatus | "ALL";
  search: string;
  sort: MissionSort;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseMissionListParams(raw: RawParams): MissionListParams {
  const status = first(raw.status);
  const sort = first(raw.sort);
  const search = (first(raw.q) ?? "").trim().slice(0, 100);
  return {
    status: MISSION_STATUSES.includes(status as MissionStatus) ? (status as MissionStatus) : "ALL",
    search,
    sort: MISSION_SORTS.includes(sort as MissionSort) ? (sort as MissionSort) : "recent",
  };
}

/** Sérialise des paramètres en query string, en omettant les valeurs par défaut. */
export function missionListHref(params: Partial<MissionListParams>, base = "/app/trainer/missions") {
  const sp = new URLSearchParams();
  if (params.status && params.status !== "ALL") sp.set("status", params.status);
  if (params.search) sp.set("q", params.search);
  if (params.sort && params.sort !== "recent") sp.set("sort", params.sort);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export function missionOrderBy(sort: MissionSort) {
  if (sort === "title") return [{ title: "asc" as const }];
  if (sort === "status") return [{ status: "asc" as const }, { updatedAt: "desc" as const }];
  return [{ updatedAt: "desc" as const }];
}
