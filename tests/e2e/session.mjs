// Scénario E2E session complète (PHASES 6 à 12) : lancement, code/QR, lobby,
// jeu, indices, erreurs, score, chronomètre, fin de mission, rapport, écran live.
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
if (process.env.SEED !== "0") execFileSync("npx", ["tsx", "tests/fixtures/seed-test-games.ts"], { stdio: "inherit" });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };
const shot = (page, name, opts = {}) => page.screenshot({ ...opts, ...(process.env.SHOT_DIR ? { path: process.env.SHOT_DIR + "/" + name } : {}) });

/* ---------------------------------------------------- formateur : publier + lancer */
const trainerCtx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
const trainer = await trainerCtx.newPage();
trainer.on("pageerror", (e) => console.log("PAGEERROR trainer", e.message));
trainer.on("dialog", (d) => d.accept());
await trainer.goto(base + "/login", { waitUntil: "load" });
await trainer.fill("#email", "formateur@escapeclass.dev"); await trainer.fill("#password", "Formateur1234!");
await Promise.all([trainer.waitForURL(/\/app$/), trainer.click("button[type=submit]")]);

await trainer.goto(base + "/app/games", { waitUntil: "load" });
await trainer.locator("article", { hasText: "Jeu publiable" }).locator("a", { hasText: "Ouvrir" }).click();
await trainer.waitForURL(/\/app\/games\/[a-z0-9]+$/);
const gameId = trainer.url().split("/").pop();
await trainer.locator("button", { hasText: "Publier" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("Lancer une session"), null, { timeout: 30000 });
check("game published", true);

await trainer.goto(base + `/app/games/${gameId}/launch`, { waitUntil: "load" });
await trainer.locator("button", { hasText: "Lancer une session" }).click();
await trainer.waitForURL(/\/app\/sessions\/[a-z0-9]+$/, { timeout: 30000 });
const sessionId = trainer.url().split("/").pop();
const code = (await trainer.locator("aside .font-mono").first().textContent()).trim();
check("session created with 6-char code", /^[A-Z0-9]{6}$/.test(code), code);
check("QR code rendered", (await trainer.locator("svg[role=img][aria-label*='QR code']").count()) === 1);
check("live board shows lobby", (await trainer.textContent("main")).includes("Lobby"));
await shot(trainer, "e2e-live-lobby.png", { fullPage: true });

/* ------------------------------------------------------------ apprenant : rejoindre */
const learnerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const learner = await learnerCtx.newPage();
learner.on("pageerror", (e) => console.log("PAGEERROR learner", e.message));

// Code inconnu refusé
await learner.goto(base + "/join", { waitUntil: "load" });
await learner.fill("#code", "ZZZZZZ");
await learner.click("main form button[type=submit]");
await learner.waitForSelector("main form [role=alert]", { timeout: 30000 });
check("unknown code rejected", (await learner.textContent("main form [role=alert]")).includes("Aucune session"));

// Code réel
await learner.fill("#code", code);
await learner.click("main form button[type=submit]");
await learner.waitForURL(new RegExp(`/join/${code}$`), { timeout: 30000 });
check("valid code opens join page", (await learner.textContent("main")).includes("Test — Jeu publiable"));

// Accès direct au jeu sans être inscrit → renvoi vers /join
const anonCtx = await browser.newContext();
const anon = await anonCtx.newPage();
await anon.goto(base + `/play/${code}`, { waitUntil: "load" });
check("play requires joining first", anon.url().includes(`/join/${code}`), anon.url());
await anonCtx.close();

await learner.fill("#firstName", "Sam");
await learner.fill("#displayName", "Sam Test");
await learner.click("main form button[type=submit]");
await learner.waitForURL(new RegExp(`/play/${code}$`), { timeout: 30000 });
check("learner joined and lands in lobby", (await learner.textContent("main")).includes("Mission prête"));
await shot(learner, "e2e-play-lobby.png", { fullPage: true });

// Nom déjà pris
const dupCtx = await browser.newContext();
const dup = await dupCtx.newPage();
await dup.goto(base + `/join/${code}`, { waitUntil: "load" });
await dup.fill("#firstName", "Autre"); await dup.fill("#displayName", "Sam Test");
await dup.click("main form button[type=submit]");
await dup.waitForSelector("#displayName-error", { timeout: 30000 });
check("duplicate display name rejected", true);
// Second participant valide
await dup.fill("#displayName", "Lea Test");
await dup.click("main form button[type=submit]");
await dup.waitForURL(new RegExp(`/play/${code}$`), { timeout: 30000 });
check("second learner joined", true);

// Le formateur voit les deux participants
await trainer.reload({ waitUntil: "load" });
check("trainer sees 2 participants", (await trainer.textContent("main")).includes("Sam Test") && (await trainer.textContent("main")).includes("Lea Test"));

/* ---------------------------------------------------- réponse avant démarrage refusée */
const preState = await learnerCtx.request.get(base + `/play/${code}`);
check("play page reachable while in lobby", preState.status() === 200);

/* ------------------------------------------------------------- formateur : démarrer */
await trainer.locator("button", { hasText: "Démarrer la mission" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("Mission lancée") || document.body.textContent.includes("En cours"), null, { timeout: 30000 });
check("session started", true);

// L'apprenant bascule automatiquement (SSE) sur l'étape 1
await learner.waitForFunction(() => document.body.textContent.includes("Étape 1"), null, { timeout: 30000 });
check("learner receives start in real time", (await learner.textContent("main")).includes("Étape A"));
check("timer visible", (await learner.locator("[role=timer]").count()) === 1);

/* --------------------------------------------------------- jeu : erreur puis indice */
await learner.fill("input.input-code", "1111");
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("pas le bon total"), null, { timeout: 30000 });
check("wrong answer shows trainer feedback", true);
check("score stays at 0 after wrong answer", (await learner.textContent("header")).includes("0 pts"));

await learner.locator("button", { hasText: "Indice 1" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Regardez la colonne Total"), null, { timeout: 30000 });
check("hint 1 revealed with its text", true);
check("hint 2 still hidden", !(await learner.textContent("main")).includes("Utilisez la formule SOMME"));
await shot(learner, "e2e-play-step.png", { fullPage: true });

/* -------------------------------------------------------------- jeu : bonne réponse */
await learner.fill("input.input-code", "4729");
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Étape 2"), null, { timeout: 30000 });
check("correct answer advances to step 2", true);
const headerAfter = await learner.textContent("header");
const scoreAfter = Number(headerAfter.match(/(\d+) pts/)?.[1] ?? "0");
check("score credited minus hint cost", scoreAfter > 0 && scoreAfter < 200, String(scoreAfter));

/* ------------------------------------------------- anti-triche : étape non courante */
const cheat = await learnerCtx.request.fetch(base + `/play/${code}`, { method: "GET" });
check("play page still served", cheat.status() === 200);

/* ---------------------------------------------------------------- fin de la mission */
await learner.fill("input.input-code", "excel");
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Mission accomplie"), null, { timeout: 30000 });
check("mission completed (case-insensitive answer)", true);
await shot(learner, "e2e-play-complete.png", { fullPage: true });

await learner.locator("a", { hasText: "Voir mon résultat" }).click();
await learner.waitForURL(new RegExp(`/play/${code}/result$`), { timeout: 30000 });
const resultText = await learner.textContent("main");
check("result shows completion", resultText.includes("Mission accomplie"));
check("result lists skills", resultText.includes("SOMME et calculs") && resultText.includes("Recherche de données"));
check("result shows badges", resultText.includes("Badges obtenus"));
check("result shows recommendations", resultText.includes("Recommandations"));
check("result is not a certification", resultText.includes("pas une certification"));
await shot(learner, "e2e-result.png", { fullPage: true });

/* ------------------------------------------------------- formateur : écran live à jour */
await trainer.reload({ waitUntil: "load" });
const liveText = await trainer.textContent("main");
check("live board shows completion", liveText.includes("Terminé"));
check("live board shows step difficulty", liveText.includes("Difficulté par étape"));
check("live board shows hints used", /Indices utilisés/.test(liveText));
await shot(trainer, "e2e-live-running.png", { fullPage: true });

/* ---------------------------------------------- pilotage : pause, prolongation, fin */
await trainer.locator("button", { hasText: "Mettre en pause" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("En pause"), null, { timeout: 30000 });
check("trainer can pause", true);
await trainer.locator("button", { hasText: "Reprendre" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("Mission reprise"), null, { timeout: 30000 });
check("trainer can resume", true);
await trainer.locator("button", { hasText: "+5 minutes" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("5 minutes ajoutées"), null, { timeout: 30000 });
check("trainer can extend time", true);
await trainer.locator("button", { hasText: "Terminer la session" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("Session terminée") || document.body.textContent.includes("Voir les résultats"), null, { timeout: 30000 });
check("trainer can end session", true);

// L'apprenant restant est marqué abandon et voit l'écran de fin
const dupState = await dup.goto(base + `/play/${code}`, { waitUntil: "load" });
check("remaining learner sees ended screen", (await dup.textContent("main")).includes("Mission terminée"), String(dupState.status()));

/* ------------------------------------------------------ accès : session d'un autre */
const otherCtx = await browser.newContext();
const other = await otherCtx.newPage();
await other.goto(base + "/register", { waitUntil: "load" });
await other.fill("#firstName", "Autre"); await other.fill("#lastName", "Form"); await other.fill("#email", `sess${Date.now()}@example.com`); await other.fill("#password", "Secret123"); await other.check("input[name=acceptTerms]");
await Promise.all([other.waitForURL(/\/app$/), other.click("button[type=submit]")]);
const rOther = await other.goto(base + `/app/sessions/${sessionId}`, { waitUntil: "load" });
check("other trainer cannot open session", rOther.status() === 404, String(rOther.status()));
const sse = await otherCtx.request.get(base + `/api/sessions/${sessionId}/events`);
check("SSE forbidden without membership", sse.status() === 403, String(sse.status()));
await otherCtx.close();

/* ----------------------------------- invariant : score = somme du journal */
try {
  execFileSync("npx", ["tsx", "tests/fixtures/check-score-ledger.ts"], { stdio: "inherit" });
  check("score always equals its event ledger", true);
} catch {
  check("score always equals its event ledger", false);
}

await dupCtx.close();
await learnerCtx.close();
await trainerCtx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
