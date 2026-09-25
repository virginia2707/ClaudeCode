// Scénario E2E génération par IA (PHASE 17) : proposition, relecture, jamais publiée.
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
if (process.env.SEED !== "0") execFileSync("npx", ["tsx", "tests/fixtures/seed-test-games.ts"], { stdio: "inherit" });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };
const shot = (page, name, opts = {}) => page.screenshot({ ...opts, ...(process.env.SHOT_DIR ? { path: process.env.SHOT_DIR + "/" + name } : {}) });

const ctx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("dialog", (d) => d.accept());

await page.goto(base + "/login", { waitUntil: "load" });
await page.fill("#email", "formateur@escapeclass.dev"); await page.fill("#password", "Formateur1234!");
await Promise.all([page.waitForURL(/\/app$/), page.click("button[type=submit]")]);

// Le raccourci existe depuis le tableau de bord
check("dashboard links to AI generation", (await page.locator("a[href='/app/games/generate']").count()) >= 1);

await page.goto(base + "/app/games/generate", { waitUntil: "load" });
check("offline provider announced", (await page.textContent("main")).includes("hors-ligne"));
check("no auto-publish promise shown", (await page.textContent("main")).includes("Rien n'est publié") || (await page.textContent("main")).includes("Rien n’est publié"));

// Validation
await page.fill("#subject", "E");
await page.fill("#stepCount", "99");
await page.click("main form button[type=submit]");
await page.waitForSelector("#subject-error", { timeout: 30000 });
check("subject validation", (await page.textContent("#subject-error")).includes("trop court"));
check("step count validation", (await page.locator("#stepCount-error").count()) === 1);

// Génération réussie
await page.fill("#subject", "Excel");
await page.selectOption("#level", "ADVANCED");
await page.fill("#durationMinutes", "40");
await page.fill("#stepCount", "4");
await page.fill("#objectives", "Formules, Références absolues, Recherche de données");
await page.click("main form button[type=submit]");
await page.waitForURL(/\/app\/games\/[a-z0-9]+\/steps\?generated=1/, { timeout: 60000 });
const gameId = page.url().match(/games\/([a-z0-9]+)\//)[1];
check("generation redirects to step builder", true);
const stepsText = await page.textContent("main");
check("review banner shown", stepsText.includes("Relisez chaque étape"));
check("generated 4 steps", (await page.locator("ol[aria-label='Étapes de la mission'] > li").count()) === 4);
check("steps carry skills", stepsText.includes("Formules"));
await shot(page, "e2e-ai-steps.png", { fullPage: true });

// Le jeu est un BROUILLON, jamais publié
await page.goto(base + `/app/games/${gameId}`, { waitUntil: "load" });
const overview = await page.textContent("main");
check("generated game stays a draft", overview.includes("Brouillon"));
check("publish button available for review", (await page.locator("button", { hasText: "Publier" }).count()) === 1);
check("scenario filled", overview.includes("Scénario") && !overview.includes("Aucun scénario rédigé"));
await shot(page, "e2e-ai-overview.png", { fullPage: true });

// Le contenu est complet : publiable après relecture
const blocking = await page.locator("[role=alert]").allTextContents();
check("no blocking errors after generation", blocking.every((t) => !t.includes("aucune réponse acceptée")), blocking.join(" | ").slice(0, 80));

// Prévisualisation : l'énigme finale est un QCM complet
await page.goto(base + `/app/games/${gameId}/preview`, { waitUntil: "load" });
await page.locator("nav[aria-label='Étapes de la prévisualisation'] button").last().click();
check("final step is a complete MCQ", (await page.textContent("main")).includes("Une seule réponse") || (await page.textContent("main")).includes("Plusieurs réponses possibles"));

// La tâche IA est journalisée
try {
  execFileSync("npx", ["tsx", "tests/fixtures/check-ai-job.ts"], { stdio: "inherit" });
  check("AI job recorded as DONE with provider", true);
} catch {
  check("AI job recorded as DONE with provider", false);
}

// Un apprenant ne peut pas générer
const learnerCtx = await browser.newContext();
const learner = await learnerCtx.newPage();
await learner.goto(base + "/login", { waitUntil: "load" });
await learner.fill("#email", "apprenant@escapeclass.dev"); await learner.fill("#password", "Apprenant1234!");
await Promise.all([learner.waitForURL(/\/join$/), learner.click("button[type=submit]")]);
const r = await learner.goto(base + "/app/games/generate", { waitUntil: "load" });
check("learner cannot open AI generation", r.status() === 403, String(r.status()));
await learnerCtx.close();

await ctx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
