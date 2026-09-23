import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Intégration sur base jetable : génération des clés de contrainte (utilisées
// par le moteur pour comparer une décision aux limites) et cloisonnement des
// compétences rattachées à une mission.

let dir: string;
let prisma: import("@prisma/client").PrismaClient;
let editor: typeof import("@/lib/data/mission-editor");
let ids: Record<string, string>;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "missionia-editor-"));
  const url = `file:${path.join(dir, "test.db")}`;
  process.env.DATABASE_URL = url;
  execFileSync("npx", ["prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });

  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient({ datasources: { db: { url } } });
  editor = await import("@/lib/data/mission-editor");

  const org = await prisma.organization.create({ data: { name: "Org", slug: "org-editor" } });
  const foreign = await prisma.organization.create({ data: { name: "Autre", slug: "autre-org" } });
  const user = await prisma.user.create({ data: { email: "e@f.fr", name: "Auteur", passwordHash: "x" } });
  const ownSkill = await prisma.skill.create({ data: { organizationId: org.id, name: "Analyse", slug: "analyse" } });
  const globalSkill = await prisma.skill.create({ data: { organizationId: null, name: "Esprit critique", slug: "esprit-critique" } });
  const foreignSkill = await prisma.skill.create({ data: { organizationId: foreign.id, name: "Secrète", slug: "secrete" } });

  ids = { orgId: org.id, foreignOrgId: foreign.id, userId: user.id, ownSkill: ownSkill.id, globalSkill: globalSkill.id, foreignSkill: foreignSkill.id };
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const scope = () => ({ organizationId: ids.orgId, userId: ids.userId });

async function newMission(title = "Mission") {
  return editor.createMission(scope(), {
    title,
    description: "",
    sector: "",
    jobTitle: "",
    level: "INTERMEDIATE",
    difficulty: "INTERMEDIATE",
    durationMinutes: 60,
    mode: "INDIVIDUAL",
  });
}

describe("createMission", () => {
  it("crée un brouillon attribué à l'organisation et à son auteur", async () => {
    const mission = await newMission("Nouvelle mission");
    expect(mission.status).toBe("DRAFT");
    expect(mission.sourceType).toBe("MANUAL");
    expect(mission.organizationId).toBe(ids.orgId);
    expect(mission.createdById).toBe(ids.userId);
    // Les champs facultatifs laissés vides ne deviennent pas des chaînes vides en base.
    expect(mission.sector).toBeNull();
    expect(mission.jobTitle).toBeNull();
  });
});

describe("addConstraint", () => {
  it("dérive une clé stable depuis l'intitulé", async () => {
    const mission = await newMission();
    const c = await editor.addConstraint(scope(), mission.id, { label: "Budget maximum", type: "BUDGET", operator: "MAX", value: 30000, unit: "€", description: "" });
    expect(c.key).toBe("budget_maximum");
    expect(c.order).toBe(0);
  });

  it("dédoublonne la clé quand deux contraintes portent le même intitulé", async () => {
    const mission = await newMission();
    const first = await editor.addConstraint(scope(), mission.id, { label: "Délai", type: "TIME", operator: "MAX", value: 48, unit: "h", description: "" });
    const second = await editor.addConstraint(scope(), mission.id, { label: "Délai", type: "TIME", operator: "MAX", value: 24, unit: "h", description: "" });
    expect(first.key).toBe("delai");
    expect(second.key).toBe("delai_2");
    expect(second.order).toBe(1);
  });

  it("refuse d'ajouter une contrainte à une mission d'une autre organisation", async () => {
    const mission = await newMission();
    await expect(
      editor.addConstraint({ organizationId: ids.foreignOrgId, userId: ids.userId }, mission.id, {
        label: "Budget",
        type: "BUDGET",
        operator: "MAX",
        value: 1,
        unit: "",
        description: "",
      }),
    ).rejects.toThrow(/NOT_IN_SCOPE/);
  });
});

describe("setMissionSkills", () => {
  it("accepte les compétences de l'organisation et de la bibliothèque globale", async () => {
    const mission = await newMission();
    const count = await editor.setMissionSkills(scope(), mission.id, [ids.ownSkill, ids.globalSkill]);
    expect(count).toBe(2);
    const rows = await prisma.missionSkill.findMany({ where: { missionId: mission.id } });
    expect(rows).toHaveLength(2);
  });

  it("ignore silencieusement une compétence appartenant à une autre organisation", async () => {
    const mission = await newMission();
    const count = await editor.setMissionSkills(scope(), mission.id, [ids.ownSkill, ids.foreignSkill]);
    expect(count).toBe(1);
    const rows = await prisma.missionSkill.findMany({ where: { missionId: mission.id } });
    expect(rows.map((r) => r.skillId)).toEqual([ids.ownSkill]);
  });

  it("remplace la sélection précédente, y compris par une liste vide", async () => {
    const mission = await newMission();
    await editor.setMissionSkills(scope(), mission.id, [ids.ownSkill, ids.globalSkill]);
    await editor.setMissionSkills(scope(), mission.id, [ids.globalSkill]);
    let rows = await prisma.missionSkill.findMany({ where: { missionId: mission.id } });
    expect(rows.map((r) => r.skillId)).toEqual([ids.globalSkill]);

    await editor.setMissionSkills(scope(), mission.id, []);
    rows = await prisma.missionSkill.findMany({ where: { missionId: mission.id } });
    expect(rows).toHaveLength(0);
  });
});

describe("upsertScenario et upsertLearnerRole", () => {
  it("créent puis mettent à jour sans dupliquer", async () => {
    const mission = await newMission();
    await editor.upsertScenario(scope(), mission.id, { companyName: "NovaTech", briefing: "Premier jet" });
    await editor.upsertScenario(scope(), mission.id, { companyName: "NovaTech", briefing: "Version corrigée" });
    const scenarios = await prisma.scenario.findMany({ where: { missionId: mission.id } });
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].briefing).toBe("Version corrigée");

    await editor.upsertLearnerRole(scope(), mission.id, { title: "Responsable marketing" });
    await editor.upsertLearnerRole(scope(), mission.id, { title: "Directeur marketing" });
    const roles = await prisma.learnerRole.findMany({ where: { missionId: mission.id } });
    expect(roles).toHaveLength(1);
    expect(roles[0].title).toBe("Directeur marketing");
  });
});

describe("mission publiée figée", () => {
  it("refuse toute modification d'une mission publiée", async () => {
    const mission = await newMission("Mission publiée");
    await prisma.mission.update({ where: { id: mission.id }, data: { status: "PUBLISHED" } });

    await expect(editor.upsertScenario(scope(), mission.id, { briefing: "Nouvelle version" })).rejects.toThrow(/MISSION_LOCKED/);
    await expect(editor.upsertLearnerRole(scope(), mission.id, { title: "Autre rôle" })).rejects.toThrow(/MISSION_LOCKED/);
    await expect(
      editor.addConstraint(scope(), mission.id, { label: "Budget", type: "BUDGET", operator: "MAX", value: 1, unit: "", description: "" }),
    ).rejects.toThrow(/MISSION_LOCKED/);
    await expect(editor.setMissionSkills(scope(), mission.id, [ids.ownSkill])).rejects.toThrow(/MISSION_LOCKED/);
    await expect(
      editor.updateMissionBasics(scope(), mission.id, {
        title: "Titre modifié",
        description: "",
        sector: "",
        jobTitle: "",
        level: "INTERMEDIATE",
        difficulty: "INTERMEDIATE",
        durationMinutes: 60,
        mode: "INDIVIDUAL",
      }),
    ).rejects.toThrow(/MISSION_LOCKED/);

    // Rien n'a bougé en base.
    const after = await prisma.mission.findUniqueOrThrow({ where: { id: mission.id }, include: { scenario: true } });
    expect(after.title).toBe("Mission publiée");
    expect(after.scenario).toBeNull();
  });

  it("redevient modifiable une fois archivée", async () => {
    const mission = await newMission("Mission archivée");
    await prisma.mission.update({ where: { id: mission.id }, data: { status: "PUBLISHED" } });
    await expect(editor.upsertScenario(scope(), mission.id, { briefing: "x" })).rejects.toThrow(/MISSION_LOCKED/);

    await prisma.mission.update({ where: { id: mission.id }, data: { status: "ARCHIVED" } });
    const scenario = await editor.upsertScenario(scope(), mission.id, { briefing: "Révision" });
    expect(scenario.briefing).toBe("Révision");
  });
});
