// Scénario E2E démo « Mission Excel — Le reporting disparu » (PHASE 18) :
// la démo est installée, publiable, jouable de bout en bout, et chaque réponse
// se déduit réellement du contenu affiché à l'apprenant.
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
if (process.env.SEED !== "0") execFileSync("npm", ["run", "seed"], { stdio: "inherit" });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };
const shot = (page, name, opts = {}) => page.screenshot({ ...opts, ...(process.env.SHOT_DIR ? { path: process.env.SHOT_DIR + "/" + name } : {}) });

/* ------------------------------------------------ page publique de la démo */
const publicCtx = await browser.newContext();
const pub = await publicCtx.newPage();
await pub.goto(base + "/demo", { waitUntil: "load" });
const pubText = await pub.textContent("main");
check("public demo page lists the 5 steps", ["Le fichier mystérieux", "Les données cachées", "L'erreur de formule", "Le code final", "Mission finale"].every((t) => pubText.includes(t)));
check("public demo page shows the unlock codes", ["4729", "EXCEL", "REPORTING", "8294"].every((c) => pubText.includes(c)));
await publicCtx.close();

/* ------------------------------------------------------- formateur : la démo */
const trainerCtx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
const trainer = await trainerCtx.newPage();
trainer.on("pageerror", (e) => console.log("PAGEERROR trainer", e.message));
trainer.on("dialog", (d) => d.accept());
await trainer.goto(base + "/login", { waitUntil: "load" });
await trainer.fill("#email", "formateur@escapeclass.dev"); await trainer.fill("#password", "Formateur1234!");
await Promise.all([trainer.waitForURL(/\/app$/), trainer.click("button[type=submit]")]);

await trainer.goto(base + "/app/games", { waitUntil: "load" });
const demoCard = trainer.locator("article", { hasText: "Le reporting disparu" });
check("demo present in trainer library", (await demoCard.count()) === 1);
check("demo is published and flagged", (await demoCard.textContent()).includes("Publié") && (await demoCard.textContent()).includes("Démo"));

await demoCard.locator("a", { hasText: "Ouvrir" }).first().click();
await trainer.waitForURL(/\/app\/games\/[a-z0-9]+$/);
const gameId = trainer.url().split("/").pop();
const overview = await trainer.textContent("main");
check("demo has 5 steps", /Étapes\s*5/.test(overview.replace(/\s+/g, " ")) || overview.includes("Étapes (5)"));
check("demo has 5 skills", overview.includes("SOMME et calculs"));
check("demo has no blocking issue", !overview.includes("aucune réponse acceptée") && !overview.includes("Ajoutez au moins une étape"));
await shot(trainer, "e2e-demo-overview.png", { fullPage: true });

// Lancer une session
await trainer.goto(base + `/app/games/${gameId}/launch`, { waitUntil: "load" });
await trainer.locator("button", { hasText: "Lancer une session" }).click();
await trainer.waitForURL(/\/app\/sessions\/[a-z0-9]+$/, { timeout: 30000 });
const code = (await trainer.locator("aside .font-mono").first().textContent()).trim();
await trainer.locator("button", { hasText: "Démarrer la mission" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("En cours"), null, { timeout: 30000 });
check("demo session started", true, code);

/* ------------------------------------------------------- apprenant : jouer */
const learnerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const learner = await learnerCtx.newPage();
learner.on("pageerror", (e) => console.log("PAGEERROR learner", e.message));
await learner.goto(base + `/join/${code}`, { waitUntil: "load" });
await learner.fill("#firstName", "Sam"); await learner.fill("#displayName", "Sam Démo");
await learner.click("main form button[type=submit]");
await learner.waitForURL(new RegExp(`/play/${code}$`), { timeout: 30000 });
await learner.waitForFunction(() => document.body.textContent.includes("Étape 1"), null, { timeout: 30000 });

// Étape 1 : le total est calculable depuis le tableau affiché
const step1 = await learner.textContent("main");
check("step 1 shows the sales table", step1.includes("412") && step1.includes("Nord"));
const sum = [412, 388, 455, 521, 470, 498, 305, 342, 367, 289, 331, 351].reduce((a, b) => a + b, 0);
check("step 1 data really sums to the expected code", sum === 4729, String(sum));
await learner.fill("input.input-code", String(sum));
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Étape 2"), null, { timeout: 30000 });
check("step 1 solved from displayed data", true);
await shot(learner, "e2e-demo-step1.png", { fullPage: true });

// Étape 2 : référence absolue
await learner.fill("input.input-code", "$B$1");
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Étape 3"), null, { timeout: 30000 });
check("step 2 solved (absolute reference)", true);

// Étape 3 : le fichier joint est téléchargeable et contient la réponse
const fileLink = learner.locator("a", { hasText: "Télécharger" });
check("step 3 offers the catalogue file", (await fileLink.count()) === 1);
const fileHref = await fileLink.getAttribute("href");
const fileRes = await learnerCtx.request.get(base + fileHref);
const csv = await fileRes.text();
check("catalogue file is served", fileRes.status() === 200, fileRes.headers()["content-type"]);
check("catalogue contains RF-204 with its price", /RF-204;[^;]+;[^;]+;68,50/.test(csv));
await learner.fill("input#" + (await learner.locator("input.input").first().getAttribute("id")), "68,50");
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Étape 4"), null, { timeout: 30000 });
check("step 3 solved from the attached file (FR decimal accepted)", true);

// Étape 4 : total de la ligne Bureautique du TCD
const pivot = [2145, 2380, 1802, 1967].reduce((a, b) => a + b, 0);
check("step 4 pivot row really sums to the expected code", pivot === 8294, String(pivot));
await learner.fill("input.input-code", String(pivot));
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Étape 5"), null, { timeout: 30000 });
check("step 4 solved from the pivot table", true);

// Étape 5 : QCM final
await learner.locator("label", { hasText: "signalant la correction" }).click();
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Mission accomplie"), null, { timeout: 30000 });
check("demo completed end to end", true);
await shot(learner, "e2e-demo-complete.png", { fullPage: true });

// Rapport : 5 compétences, toutes acquises
await learner.goto(base + `/play/${code}/result`, { waitUntil: "load" });
const report = await learner.textContent("main");
for (const skill of ["SOMME et calculs", "Références relatives et absolues", "Recherche de données", "Tableau croisé dynamique", "Analyse des résultats"]) {
  check(`report lists skill: ${skill}`, report.includes(skill));
}
check("all demo skills acquired", (report.match(/acquise/g) ?? []).length === 5, String((report.match(/acquise/g) ?? []).length));
await shot(learner, "e2e-demo-report.png", { fullPage: true });

/* ---------------------------------------- nouveau formateur : démo installée */
const freshCtx = await browser.newContext();
const fresh = await freshCtx.newPage();
await fresh.goto(base + "/register", { waitUntil: "load" });
await fresh.fill("#firstName", "Nouveau"); await fresh.fill("#lastName", "Formateur");
await fresh.fill("#email", `demo${Date.now()}@example.com`); await fresh.fill("#password", "Secret123");
await fresh.check("input[name=acceptTerms]");
await Promise.all([fresh.waitForURL(/\/app$/), fresh.click("button[type=submit]")]);
await fresh.goto(base + "/app/games", { waitUntil: "load" });
check("new trainer account gets the demo", (await fresh.locator("article", { hasText: "Le reporting disparu" }).count()) === 1);
await freshCtx.close();

await learnerCtx.close();
await trainerCtx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
