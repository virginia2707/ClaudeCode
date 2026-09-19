"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MISSION_SORTS, MISSION_SORT_LABELS, MISSION_STATUS_LABELS, missionListHref, type MissionListParams } from "@/lib/data/mission-filters";
import { MISSION_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

const TABS = ["ALL", ...MISSION_STATUSES] as const;

export function MissionFilters({ params, counts }: { params: MissionListParams; counts: Record<string, number> }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-4">
      <nav aria-label="Filtrer par statut">
        <ul className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const active = params.status === tab;
            const label = tab === "ALL" ? "Toutes" : MISSION_STATUS_LABELS[tab];
            return (
              <li key={tab}>
                <Link
                  href={missionListHref({ ...params, status: tab })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-accent-soft font-semibold text-accent" : "text-text-secondary hover:bg-surface-2 hover:text-text",
                  )}
                >
                  {label}
                  <span className="mono-num text-xs text-text-muted">{counts[tab] ?? 0}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form
          role="search"
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const value = String(new FormData(e.currentTarget).get("q") ?? "");
            router.push(missionListHref({ ...params, search: value }));
          }}
        >
          <label htmlFor="mission-search" className="label">
            Rechercher
          </label>
          <input
            id="mission-search"
            name="q"
            type="search"
            className="input"
            placeholder="Titre, secteur, métier…"
            defaultValue={searchParams.get("q") ?? ""}
          />
        </form>
        <div className="sm:w-56">
          <label htmlFor="mission-sort" className="label">
            Trier
          </label>
          <select
            id="mission-sort"
            className="input"
            defaultValue={params.sort}
            onChange={(e) => router.push(missionListHref({ ...params, sort: e.target.value as MissionListParams["sort"] }))}
          >
            {MISSION_SORTS.map((s) => (
              <option key={s} value={s}>
                {MISSION_SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
