// Scénario E2E mode équipe, classement et résultats (PHASES 13 à 15).
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
if (process.env.SEED !== "0") execFileSync("npx", ["tsx", "tests/fixtures/seed-test-games.ts"], { stdio: "inherit" });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };
const shot = (page, name, opts = {}) => page.screenshot({ ...opts, ...(process.env.SHOT_DIR ? { path: process.env.SHOT_DIR + "/" + name } : {}) });

const trainerCtx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
const trainer = await trainerCtx.newPage();
trainer.on("pageerror", (e) => console.log("PAGEERROR trainer", e.message));
trainer.on("dialog", (d) => d.accept());
await trainer.goto(base + "/login", { waitUntil: "load" });
await trainer.fill("#email", "formateur@escapeclass.dev"); await trainer.fill("#password", "Formateur1234!");
await Promise.all([trainer.waitForURL(/\/app$/), trainer.click("button[type=submit]")]);

// Publier et lancer une session EN ÉQUIPE
await trainer.goto(base + "/app/games", { waitUntil: "load" });
await trainer.locator("article", { hasText: "Jeu publiable" }).locator("a", { hasText: "Ouvrir" }).click();
await trainer.waitForURL(/\/app\/games\/[a-z0-9]+$/);
const gameId = trainer.url().split("/").pop();
await trainer.locator("button", { hasText: "Publier" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("Lancer une session"), null, { timeout: 30000 });
await trainer.goto(base + `/app/games/${gameId}/launch`, { waitUntil: "load" });
await trainer.selectOption("#mode", "TEAM");
await trainer.locator("button", { hasText: "Lancer une session" }).click();
await trainer.waitForURL(/\/app\/sessions\/[a-z0-9]+$/, { timeout: 30000 });
const sessionId = trainer.url().split("/").pop();
const code = (await trainer.locator("aside .font-mono").first().textContent()).trim();
check("team session launched", (await trainer.textContent("main")).includes("Équipe"), code);

// Deux membres de l'équipe Alpha + une équipe Beta
const join = async (first, display, team) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", display, e.message));
  await page.goto(base + `/join/${code}`, { waitUntil: "load" });
  await page.fill("#firstName", first);
  await page.fill("#displayName", display);
  await page.fill("#teamName", team);
  await page.click("main form button[type=submit]");
  await page.waitForURL(new RegExp(`/play/${code}$`), { timeout: 30000 });
  return { ctx, page };
};
const alpha1 = await join("Ana", "Ana A", "Équipe Alpha");
const alpha2 = await join("Bob", "Bob A", "Équipe Alpha");
const beta1 = await join("Cleo", "Cleo B", "Équipe Beta");
check("team members joined", (await alpha1.page.textContent("main")).includes("Équipe Alpha"), await alpha1.page.textContent("h1"));

// Équipe obligatoire en mode équipe
const noTeamCtx = await browser.newContext();
const noTeam = await noTeamCtx.newPage();
await noTeam.goto(base + `/join/${code}`, { waitUntil: "load" });
await noTeam.fill("#firstName", "Dan"); await noTeam.fill("#displayName", "Dan X");
check("team field required", await noTeam.locator("#teamName").isVisible());
await noTeamCtx.close();

// Le formateur voit 2 équipes et 3 participants
await trainer.reload({ waitUntil: "load" });
const liveText = await trainer.textContent("main");
check("trainer sees both teams", liveText.includes("Équipe Alpha") && liveText.includes("Équipe Beta"));
check("trainer sees team members", liveText.includes("Ana A, Bob A"));
check("participants counted individually", /Participants[\s\S]{0,40}3/.test(liveText));

await trainer.locator("button", { hasText: "Démarrer la mission" }).click();
await alpha1.page.waitForFunction(() => document.body.textContent.includes("Étape 1"), null, { timeout: 30000 });
await alpha2.page.waitForFunction(() => document.body.textContent.includes("Étape 1"), null, { timeout: 30000 });
check("both team members start together", true);

// Ana résout l'étape 1 : Bob (même équipe) avance aussi
await alpha1.page.fill("input.input-code", "4729");
await alpha1.page.locator("button", { hasText: "Valider" }).click();
await alpha1.page.waitForFunction(() => document.body.textContent.includes("Étape 2"), null, { timeout: 30000 });
await alpha2.page.waitForFunction(() => document.body.textContent.includes("Étape 2"), null, { timeout: 30000 });
check("team progress is shared in real time", true);
await shot(alpha2.page, "e2e-team-shared.png", { fullPage: true });

// Beta reste à l'étape 1
check("other team unaffected", (await beta1.page.textContent("main")).includes("Étape 1"));

// Bob termine pour l'équipe
await alpha2.page.fill("input.input-code", "EXCEL");
await alpha2.page.locator("button", { hasText: "Valider" }).click();
await alpha2.page.waitForFunction(() => document.body.textContent.includes("Mission accomplie"), null, { timeout: 30000 });
await alpha1.page.waitForFunction(() => document.body.textContent.includes("Mission accomplie"), null, { timeout: 30000 });
check("team completes together", true);
check("learner sees leaderboard at the end", (await alpha1.page.textContent("main")).includes("Classement"));
await shot(alpha1.page, "e2e-team-leaderboard.png", { fullPage: true });

// Badge d'équipe
await alpha1.page.goto(base + `/play/${code}/result`, { waitUntil: "load" });
const resultText = await alpha1.page.textContent("main");
check("team badge awarded", resultText.includes("Team Player"), resultText.includes("Badges obtenus") ? "badges present" : "no badges");
check("result shows team name", resultText.includes("Équipe Alpha"));

// Terminer et consulter les résultats
await trainer.locator("button", { hasText: "Terminer la session" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("Voir les résultats"), null, { timeout: 30000 });
await trainer.locator("a", { hasText: "Voir les résultats" }).click();
await trainer.waitForURL(/\/results$/, { timeout: 30000 });
const res = await trainer.textContent("main");
check("results page ranks teams", res.includes("Équipe Alpha") && res.includes("Équipe Beta"));
check("results show completion rate", /Taux de réussite/.test(res));
check("results show hardest puzzles", res.includes("Énigmes les plus difficiles"));
check("results show skills", res.includes("Compétences acquises") && res.includes("SOMME et calculs"));
check("results show abandon rate", res.includes("Taux d'abandon"));
await shot(trainer, "e2e-session-results.png", { fullPage: true });

// Statistiques du jeu
await trainer.goto(base + `/app/games/${gameId}/stats`, { waitUntil: "load" });
const statsText = await trainer.textContent("main");
check("game stats aggregate sessions", statsText.includes("Comparaison des sessions") && statsText.includes(code));
check("game stats show problem skills", statsText.includes("Compétences problématiques"));
await shot(trainer, "e2e-game-stats.png", { fullPage: true });

// Accès refusé aux résultats d'un autre formateur
const otherCtx = await browser.newContext();
const other = await otherCtx.newPage();
await other.goto(base + "/register", { waitUntil: "load" });
await other.fill("#firstName", "Autre"); await other.fill("#lastName", "Form"); await other.fill("#email", `res${Date.now()}@example.com`); await other.fill("#password", "Secret123"); await other.check("input[name=acceptTerms]");
await Promise.all([other.waitForURL(/\/app$/), other.click("button[type=submit]")]);
const r1 = await other.goto(base + `/app/sessions/${sessionId}/results`, { waitUntil: "load" });
check("results protected from other trainers", r1.status() === 404, String(r1.status()));
const r2 = await other.goto(base + `/app/games/${gameId}/stats`, { waitUntil: "load" });
check("stats protected from other trainers", r2.status() === 404, String(r2.status()));
await otherCtx.close();

for (const c of [alpha1, alpha2, beta1]) await c.ctx.close();
await trainerCtx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
