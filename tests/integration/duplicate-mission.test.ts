import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Test d'intégration sur une base SQLite jetable : la copie profonde d'une
// mission doit remapper les identifiants internes du moteur. Une copie qui
// pointerait encore vers les étapes de la mission source serait un défaut
// silencieux, invisible à l'écran mais fatal au moment de jouer la mission.

let dir: string;
let prisma: import("@prisma/client").PrismaClient;
let duplicateMission: typeof import("@/lib/data/missions").duplicateMission;
let ids: Record<string, string>;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "missionia-dup-"));
  const dbPath = path.join(dir, "test.db");
  process.env.DATABASE_URL = `file:${dbPath}`;
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });

  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient({ datasources: { db: { url: `file:${dbPath}` } } });
  ({ duplicateMission } = await import("@/lib/data/missions"));

  const org = await prisma.organization.create({ data: { name: "Org", slug: "org" } });
  const author = await prisma.user.create({ data: { email: "a@b.fr", name: "Auteur", passwordHash: "x" } });
  const other = await prisma.user.create({ data: { email: "c@d.fr", name: "Autre", passwordHash: "x" } });
  const skill = await prisma.skill.create({ data: { organizationId: org.id, name: "Analyse", slug: "analyse" } });

  const mission = await prisma.mission.create({
    data: {
      organizationId: org.id,
      createdById: author.id,
      title: "Mission source",
      status: "PUBLISHED",
      scoringMode: "SKILLS_ONLY",
      coachEnabled: false,
      scenario: { create: { companyName: "NovaTech", briefing: "Briefing" } },
      learnerRole: { create: { title: "Responsable marketing" } },
      constraints: { create: [{ key: "budget", label: "Budget", type: "BUDGET", operator: "MAX", value: 30000, unit: "€" }] },
      skills: { create: [{ skillId: skill.id }] },
    },
  });

  const s1 = await prisma.missionStep.create({ data: { missionId: mission.id, order: 0, key: "s1", title: "Analyser", successCriteria: "corrigé confidentiel" } });
  const s2 = await prisma.missionStep.create({ data: { missionId: mission.id, order: 1, key: "s2", title: "Décider", stepType: "DECISION" } });
  const s3 = await prisma.missionStep.create({ data: { missionId: mission.id, order: 2, key: "s3", title: "Livrer", stepType: "DOCUMENT" } });
  const resource = await prisma.resource.create({ data: { missionId: mission.id, stepId: s1.id, title: "Étude", type: "TEXT", content: "…" } });
  await prisma.dataSet.create({ data: { missionId: mission.id, stepId: s1.id, title: "Pipeline", anomaliesJson: JSON.stringify(["anomalie"]) } });
  await prisma.task.create({ data: { stepId: s1.id, type: "MCQ", prompt: "Quel segment ?", answerKeyJson: JSON.stringify({ correct: "PME" }), skillId: skill.id } });
  await prisma.stepSkill.create({ data: { stepId: s1.id, skillId: skill.id } });
  const deliverable = await prisma.deliverable.create({ data: { stepId: s3.id, title: "Plan", format: "ACTION_PLAN", isFinal: true } });
  await prisma.evaluationCriteria.create({ data: { deliverableId: deliverable.id, label: "Clarté", maxPoints: 20, rubricJson: JSON.stringify([{ points: 20 }]) } });
  await prisma.evaluationCriteria.create({ data: { missionId: mission.id, label: "Justification", maxPoints: 10 } });

  const decision = await prisma.decision.create({ data: { stepId: s2.id, title: "Budget", prompt: "Où investir ?" } });
  const optA = await prisma.decisionOption.create({ data: { decisionId: decision.id, label: "A", text: "LinkedIn", quality: "OPTIMAL", scoreDelta: 20 } });
  const optB = await prisma.decisionOption.create({ data: { decisionId: decision.id, label: "B", text: "Influence", quality: "POOR" } });
  await prisma.decisionOutcome.create({ data: { optionId: optA.id, consequenceText: "Leads", nextStepId: s3.id, unlockStepId: s3.id } });
  await prisma.decisionOutcome.create({ data: { optionId: optB.id, consequenceText: "Dépassement", nextStepId: s2.id, revealResourceId: resource.id } });

  ids = { orgId: org.id, authorId: author.id, otherId: other.id, missionId: mission.id, s1: s1.id, s2: s2.id, s3: s3.id, resourceId: resource.id, deliverableId: deliverable.id };
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("duplicateMission", () => {
  it("copie la mission en brouillon, attribuée à celui qui duplique", async () => {
    const copy = await duplicateMission({ organizationId: ids.orgId, userId: ids.otherId }, ids.missionId);
    expect(copy.id).not.toBe(ids.missionId);
    expect(copy.title).toBe("Mission source (copie)");
    expect(copy.status).toBe("DRAFT");
    expect(copy.version).toBe(1);
    expect(copy.sourceType).toBe("DUPLICATED");
    expect(copy.duplicatedFromId).toBe(ids.missionId);
    expect(copy.createdById).toBe(ids.otherId);
    // Les réglages pédagogiques suivent la copie.
    expect(copy.scoringMode).toBe("SKILLS_ONLY");
    expect(copy.coachEnabled).toBe(false);
  });

  it("recopie scénario, rôle, contraintes, compétences, étapes et contenus", async () => {
    const copy = await duplicateMission({ organizationId: ids.orgId, userId: ids.authorId }, ids.missionId);
    const full = await prisma.mission.findUniqueOrThrow({
      where: { id: copy.id },
      include: {
        scenario: true,
        learnerRole: true,
        constraints: true,
        skills: true,
        criteria: true,
        resources: true,
        datasets: true,
        steps: { orderBy: { order: "asc" }, include: { tasks: true, skills: true, deliverables: { include: { criteria: true } }, decisions: { include: { options: { include: { outcome: true } } } } } },
      },
    });

    expect(full.scenario?.companyName).toBe("NovaTech");
    expect(full.learnerRole?.title).toBe("Responsable marketing");
    expect(full.constraints).toHaveLength(1);
    expect(full.constraints[0].value).toBe(30000);
    expect(full.skills).toHaveLength(1);
    expect(full.steps.map((s) => s.key)).toEqual(["s1", "s2", "s3"]);
    expect(full.steps[0].successCriteria).toBe("corrigé confidentiel");
    expect(full.steps[0].tasks[0].answerKeyJson).toBe(JSON.stringify({ correct: "PME" }));
    expect(full.steps[0].skills).toHaveLength(1);
    expect(full.resources).toHaveLength(1);
    expect(full.datasets[0].anomaliesJson).toBe(JSON.stringify(["anomalie"]));
    expect(full.steps[2].deliverables[0].title).toBe("Plan");
    expect(full.steps[2].deliverables[0].criteria.map((c) => c.label)).toEqual(["Clarté"]);
    expect(full.criteria.map((c) => c.label)).toEqual(["Justification"]);
  });

  it("remappe le branchement vers les étapes et ressources de la copie", async () => {
    const copy = await duplicateMission({ organizationId: ids.orgId, userId: ids.authorId }, ids.missionId);
    const full = await prisma.mission.findUniqueOrThrow({
      where: { id: copy.id },
      include: { resources: true, steps: { orderBy: { order: "asc" }, include: { decisions: { include: { options: { orderBy: { order: "asc" }, include: { outcome: true } } } } } } },
    });
    const [newS2, newS3] = [full.steps[1], full.steps[2]];
    const options = full.steps[1].decisions[0].options;

    // Option A : enchaîne et débloque l'étape 3 DE LA COPIE, pas de la source.
    expect(options[0].outcome?.nextStepId).toBe(newS3.id);
    expect(options[0].outcome?.unlockStepId).toBe(newS3.id);
    expect(options[0].outcome?.nextStepId).not.toBe(ids.s3);
    // Option B : rejoue l'étape 2 de la copie et révèle la ressource copiée.
    expect(options[1].outcome?.nextStepId).toBe(newS2.id);
    expect(options[1].outcome?.revealResourceId).toBe(full.resources[0].id);
    expect(options[1].outcome?.revealResourceId).not.toBe(ids.resourceId);
    // Aucune référence résiduelle vers la mission source.
    const sourceIds = new Set([ids.s1, ids.s2, ids.s3, ids.resourceId]);
    for (const opt of options) {
      for (const ref of [opt.outcome?.nextStepId, opt.outcome?.unlockStepId, opt.outcome?.revealResourceId]) {
        if (ref) expect(sourceIds.has(ref)).toBe(false);
      }
    }
  });

  it("laisse la mission source intacte", async () => {
    const source = await prisma.mission.findUniqueOrThrow({ where: { id: ids.missionId }, include: { steps: true } });
    expect(source.status).toBe("PUBLISHED");
    expect(source.title).toBe("Mission source");
    expect(source.steps).toHaveLength(3);
  });

  it("refuse de dupliquer une mission d'une autre organisation", async () => {
    await expect(duplicateMission({ organizationId: "autre-org", userId: ids.authorId }, ids.missionId)).rejects.toThrow(/NOT_IN_SCOPE/);
  });
});
