// Scénario E2E dashboard formateur (PHASE 3). Prérequis : serveur démarré, `npm run seed` et `npx tsx tests/fixtures/seed-test-games.ts`.
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");

// Réinitialise les jeux de test : les compteurs de ce scénario sont absolus.
if (process.env.SEED !== "0") execFileSync("npx", ["tsx", "tests/fixtures/seed-test-games.ts"], { stdio: "inherit" });
const base = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };
const shot = (page, name, opts = {}) => page.screenshot({ ...opts, ...(process.env.SHOT_DIR ? { path: process.env.SHOT_DIR + "/" + name } : {}) });

const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("dialog", (d) => d.accept());

await page.goto(base + "/login", { waitUntil: "load" });
await page.fill("#email", "formateur@escapeclass.dev"); await page.fill("#password", "Formateur1234!");
await Promise.all([page.waitForURL(/\/app$/), page.click("button[type=submit]")]);

// Dashboard stats
const gamesStat = await page.locator("main .card-2").first().locator(".text-2xl").textContent();
check("dashboard counts active games (2)", gamesStat?.trim() === "2", gamesStat ?? "");
check("dashboard lists recent games", (await page.locator("article").count()) >= 2);
await shot(page, "e2e-dashboard.png", { fullPage: true });

// Games list + filters
await page.goto(base + "/app/games", { waitUntil: "load" });
check("games list shows 3 cards", (await page.locator("article").count()) === 3);
await page.goto(base + "/app/games?status=ARCHIVED", { waitUntil: "load" });
check("archived filter shows 1", (await page.locator("article").count()) === 1);
await page.goto(base + "/app/games?status=DRAFT", { waitUntil: "load" });
check("draft filter shows 2", (await page.locator("article").count()) === 2);
await shot(page, "e2e-games-list.png", { fullPage: true });

// Empty game: publish blocked
await page.goto(base + "/app/games?status=DRAFT", { waitUntil: "load" });
await page.locator("article", { hasText: "Jeu vide" }).locator("a", { hasText: "Ouvrir" }).click();
await page.waitForURL(/\/app\/games\/[a-z0-9]+$/);
check("empty game url", /\/app\/games\/[a-z0-9]+$/.test(page.url()));
check("empty game shows blocking issue", (await page.textContent("main")).includes("Ajoutez au moins une étape"));
check("publish button disabled on empty game", await page.locator("button", { hasText: "Publier" }).isDisabled());

// Valid game: publish
await page.goto(base + "/app/games?status=DRAFT", { waitUntil: "load" });
await page.locator("article", { hasText: "Jeu publiable" }).locator("a", { hasText: "Ouvrir" }).click();
await page.waitForURL(/\/app\/games\/[a-z0-9]+$/);
const validUrl = page.url();
check("valid game has no blocking error", !(await page.textContent("main")).includes("aucune réponse acceptée"));
await page.locator("button", { hasText: "Publier" }).click();
await page.waitForSelector("main [role=status]:has-text('publié')", { timeout: 30000 });
await page.waitForFunction(() => document.body.textContent.includes("Lancer une session"), null, { timeout: 30000 });
check("game published: launch button visible", true);
await shot(page, "e2e-game-overview.png", { fullPage: true });

// Unpublish
await page.locator("button", { hasText: "Dépublier" }).click();
await page.waitForFunction(() => document.body.textContent.includes("repassé en brouillon"), null, { timeout: 30000 });
check("unpublish works", true);

// Duplicate -> redirect to copy
await page.locator("button", { hasText: "Dupliquer" }).click();
await page.waitForURL((u) => u.toString().match(/\/app\/games\/[a-z0-9]+$/) && u.toString() !== validUrl, { timeout: 30000 });
check("duplicate redirects to new game", (await page.locator("h1").textContent()).includes("(copie)"));
check("duplicate copied steps", (await page.textContent("main")).includes("Étapes (2)"));
const copyUrl = page.url();

// Plan limit: PRO unlimited -> fine. Archive the copy, restore it, delete it.
await page.locator("button", { hasText: "Archiver" }).click();
await page.waitForFunction(() => document.body.textContent.includes("archivé"), null, { timeout: 30000 });
check("archive works", true);
await page.locator("button", { hasText: "Restaurer" }).click();
await page.waitForFunction(() => document.body.textContent.includes("restauré"), null, { timeout: 30000 });
check("restore works", true);
await page.locator("button", { hasText: "Supprimer" }).click();
await page.waitForURL(/\/app\/games\?deleted=1/, { timeout: 30000 });
check("delete redirects to list", true);
const r404 = await page.goto(copyUrl, { waitUntil: "load" });
check("deleted game is 404", r404.status() === 404);

// Ownership: another trainer cannot see the game
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(base + "/register", { waitUntil: "load" });
await p2.fill("#firstName", "Autre"); await p2.fill("#lastName", "Formateur"); await p2.fill("#email", `other${Date.now()}@example.com`); await p2.fill("#password", "Secret123"); await p2.check("input[name=acceptTerms]");
await Promise.all([p2.waitForURL(/\/app$/), p2.click("button[type=submit]")]);
const rOther = await p2.goto(validUrl, { waitUntil: "load" });
check("other trainer gets 404 on foreign game", rOther.status() === 404);
await ctx2.close();

// Skills
await page.goto(base + "/app/skills", { waitUntil: "load" });
const skillName = "Compétence test " + Date.now();
await page.fill("#name", skillName); await page.fill("#category", "Test");
await page.click("main form button[type=submit]");
await page.waitForFunction((n) => document.body.textContent.includes(n), skillName, { timeout: 30000 });
check("skill created", true);
await page.fill("#name", skillName);
await page.click("main form button[type=submit]");
await page.waitForFunction(() => document.body.textContent.includes("existe déjà"), null, { timeout: 30000 });
check("duplicate skill rejected", true);
const usedRow = page.locator("li", { hasText: "SOMME et calculs" });
check("used skill delete disabled", await usedRow.locator("button").isDisabled());
await page.locator("li", { hasText: skillName }).locator("button").click();
await page.waitForFunction((n) => !document.body.textContent.includes(n), skillName, { timeout: 30000 });
check("skill deleted", true);
await shot(page, "e2e-skills.png");

// Settings: profile + password roundtrip
await page.goto(base + "/app/settings", { waitUntil: "load" });
await page.fill("#firstName", "Camille2");
await page.locator("form", { hasText: "Profil" }).locator("button[type=submit]").click();
await page.waitForFunction(() => document.body.textContent.includes("Profil mis à jour"), null, { timeout: 30000 });
check("profile updated", (await page.textContent("aside")).includes("Camille2"));
await page.fill("#firstName", "Camille");
await page.locator("form", { hasText: "Profil" }).locator("button[type=submit]").click();
await page.waitForFunction(() => document.querySelector("aside")?.textContent?.includes("Camille Formatrice"), null, { timeout: 30000 });
const pw = page.locator("form", { hasText: "Mot de passe" });
await pw.locator("#current").fill("wrong"); await pw.locator("#next").fill("Formateur1234!"); await pw.locator("#confirm").fill("Formateur1234!");
await pw.locator("button[type=submit]").click();
await page.waitForFunction(() => document.body.textContent.includes("actuel incorrect"), null, { timeout: 30000 });
check("wrong current password rejected", true);
await pw.locator("#current").fill("Formateur1234!"); await pw.locator("#next").fill("Formateur1234!"); await pw.locator("#confirm").fill("Formateur1234!");
await pw.locator("button[type=submit]").click();
await page.waitForFunction(() => document.body.textContent.includes("Mot de passe modifié"), null, { timeout: 30000 });
check("password changed", true);

// Sessions page empty state
await page.goto(base + "/app/sessions", { waitUntil: "load" });
check("sessions empty state", (await page.textContent("main")).includes("Aucune session"));

// Mobile overview
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(base + "/login", { waitUntil: "load" });
await mp.fill("#email", "formateur@escapeclass.dev"); await mp.fill("#password", "Formateur1234!");
await Promise.all([mp.waitForURL(/\/app$/), mp.click("button[type=submit]")]);
await mp.goto(validUrl, { waitUntil: "load" });
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
check("mobile overview no overflow", !overflow);
await shot(mp, "e2e-overview-mobile.png", { fullPage: true });
await m.close();

await ctx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
