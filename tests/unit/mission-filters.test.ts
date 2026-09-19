import { describe, expect, it } from "vitest";
import { missionListHref, missionOrderBy, parseMissionListParams } from "@/lib/data/mission-filters";

describe("parseMissionListParams", () => {
  it("applique les valeurs par défaut", () => {
    expect(parseMissionListParams({})).toEqual({ status: "ALL", search: "", sort: "recent" });
  });

  it("accepte les valeurs connues et rejette les autres", () => {
    expect(parseMissionListParams({ status: "PUBLISHED", sort: "title" })).toMatchObject({ status: "PUBLISHED", sort: "title" });
    expect(parseMissionListParams({ status: "DROP TABLE", sort: "../../etc" })).toMatchObject({ status: "ALL", sort: "recent" });
  });

  it("nettoie la recherche : espaces retirés, longueur bornée", () => {
    expect(parseMissionListParams({ q: "  marketing  " }).search).toBe("marketing");
    expect(parseMissionListParams({ q: "x".repeat(500) }).search).toHaveLength(100);
  });

  it("ne garde que la première valeur d'un paramètre répété", () => {
    expect(parseMissionListParams({ status: ["PUBLISHED", "DRAFT"] }).status).toBe("PUBLISHED");
  });
});

describe("missionListHref", () => {
  it("omet les valeurs par défaut", () => {
    expect(missionListHref({ status: "ALL", search: "", sort: "recent" })).toBe("/app/trainer/missions");
  });
  it("sérialise et encode les filtres actifs", () => {
    expect(missionListHref({ status: "DRAFT", search: "plan & budget", sort: "title" })).toBe(
      "/app/trainer/missions?status=DRAFT&q=plan+%26+budget&sort=title",
    );
  });
});

describe("missionOrderBy", () => {
  it("trie par défaut sur la dernière modification", () => {
    expect(missionOrderBy("recent")).toEqual([{ updatedAt: "desc" }]);
  });
  it("trie par titre puis par statut avec repli", () => {
    expect(missionOrderBy("title")).toEqual([{ title: "asc" }]);
    expect(missionOrderBy("status")).toEqual([{ status: "asc" }, { updatedAt: "desc" }]);
  });
});
