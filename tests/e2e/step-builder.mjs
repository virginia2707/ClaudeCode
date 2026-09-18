// Scénario E2E Step Builder (PHASE 5) : CRUD d'étapes, réordonnancement, éditeur d'énigme, indices, compétences, prévisualisation.
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");

// Réinitialise les jeux de test pour des compteurs déterministes.
if (process.env.SEED !== "0") execFileSync("npx", ["tsx", "tests/fixtures/seed-test-games.ts"], { stdio: "inherit" });
const base = process.env.BASE ?? "http://localhost:3100";
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

// Ouvrir le Step Builder du jeu publiable (2 étapes seedées)
await page.goto(base + "/app/games", { waitUntil: "load" });
await page.locator("article", { hasText: "Jeu publiable" }).locator("a", { hasText: "Ouvrir" }).click();
await page.waitForURL(/\/app\/games\/[a-z0-9]+$/);
const gameId = page.url().split("/").pop();
await page.goto(base + `/app/games/${gameId}/steps`, { waitUntil: "load" });
check("step builder lists seeded steps", (await page.locator("ol[aria-label='Étapes de la mission'] > li").count()) === 2);

// Ajouter une étape
await page.locator("button", { hasText: "Ajouter une étape" }).first().click();
await page.waitForFunction(() => document.querySelectorAll("ol[aria-label='Étapes de la mission'] > li").length === 3, null, { timeout: 30000 });
check("add step", true);

// Réordonner : descendre la première
const firstTitle = await page.locator("ol[aria-label='Étapes de la mission'] > li").first().locator("a").first().textContent();
await page.locator("button[aria-label=\"Descendre l'étape 1\"]").click();
await page.waitForFunction((t) => document.querySelectorAll("ol[aria-label='Étapes de la mission'] > li")[1]?.innerText.includes(t), firstTitle, { timeout: 30000 });
check("reorder moves step down", true);
// Attendre la confirmation serveur avant de recharger (l'affichage est optimiste).
await page.waitForFunction(() => document.body.innerText.includes("Ordre enregistré"), null, { timeout: 30000 });
await page.reload({ waitUntil: "load" });
const afterReload = await page.locator("ol[aria-label='Étapes de la mission'] > li").nth(1).textContent();
check("reorder persisted after reload", afterReload.includes(firstTitle.trim()), afterReload.slice(0, 40));

// Dupliquer puis supprimer la copie
await page.locator("ol[aria-label='Étapes de la mission'] > li").first().locator("button", { hasText: "Dupliquer" }).click();
await page.waitForFunction(() => document.body.innerText.includes("(copie)"), null, { timeout: 30000 });
check("duplicate step", (await page.locator("ol[aria-label='Étapes de la mission'] > li").count()) === 4);
await page.locator("li", { hasText: "(copie)" }).locator("button", { hasText: "Supprimer" }).click();
await page.waitForFunction(() => !document.body.innerText.includes("(copie)"), null, { timeout: 30000 });
check("delete step", (await page.locator("ol[aria-label='Étapes de la mission'] > li").count()) === 3);
await shot(page, "e2e-step-builder.png", { fullPage: true });

// Éditeur : étape « À compléter » (celle ajoutée)
await page.locator("li", { hasText: "À compléter" }).first().locator("a", { hasText: "Modifier" }).click();
await page.waitForURL(/\/steps\/[a-z0-9]+$/);
const stepUrl = page.url();

// Validation : titre trop court
await page.fill("#title", "a");
await page.click("main form button[type=submit]");
await page.waitForSelector("#title-error", { timeout: 30000 });
check("step form: title validation", (await page.textContent("#title-error")).includes("trop court"));

// Énigme QCM complète avec indices et compétences
await page.fill("#title", "Étape QCM E2E");
await page.fill("#instruction", "Choisissez la bonne formule.");
await page.fill("#prompt", "Quelle fonction additionne une plage ?");
await page.selectOption("#puzzleTypeSelect", "MCQ");
await page.waitForSelector("#mcq-a", { timeout: 10000 });
await page.fill("#mcq-a", "SOMME");
await page.fill("#mcq-b", "MOYENNE");
await page.locator("input[name=mcq-correct]").first().check();
check("MCQ has exactly two choices", (await page.locator("input[id^='mcq-']").count()) === 2);
await page.locator("main button", { hasText: "Ajouter un indice" }).click();
await page.fill("#hint-text-0", "Regardez la colonne Total.");
await page.fill("#hint-cost-0", "15");
await page.fill("#skill-draft", "Formules simples");
await page.locator("#skill-draft").press("Enter");
check("skill added as pill", (await page.locator("button[aria-label='Retirer la compétence Formules simples']").count()) === 1);
await page.fill("#unlockCode", "4729");
await page.fill("#points", "150");
await page.check("input[name=isFinal]");
await page.click("main form button[type=submit]");
await page.waitForFunction(() => document.body.innerText.includes("Étape enregistrée"), null, { timeout: 30000 });
check("step saved with MCQ, hint, skill", true);

// Rechargement : tout est persisté
await page.reload({ waitUntil: "load" });
check("puzzle type persisted", (await page.inputValue("#puzzleTypeSelect")) === "MCQ");
check("choices persisted", (await page.inputValue("#mcq-a")) === "SOMME");
check("correct answer persisted", await page.locator("input[name=mcq-correct]").first().isChecked());
check("hint persisted", (await page.inputValue("#hint-text-0")) === "Regardez la colonne Total." && (await page.inputValue("#hint-cost-0")) === "15");
check("skill persisted", (await page.locator("button[aria-label='Retirer la compétence Formules simples']").count()) === 1);
check("unlock code and points persisted", (await page.inputValue("#unlockCode")) === "4729" && (await page.inputValue("#points")) === "150");
await shot(page, "e2e-step-editor.png", { fullPage: true });

// Une seule étape finale : l'ancienne a été désactivée
await page.goto(base + `/app/games/${gameId}/steps`, { waitUntil: "load" });
check("single final step", (await page.locator("li:has-text('Mission finale')").count()) === 1);
check("step no longer flagged incomplete", (await page.locator("li", { hasText: "Étape QCM E2E" }).locator("text=À compléter").count()) === 0);

// Types d'énigmes : ordre logique et association enregistrent leurs réponses dérivées
await page.goto(stepUrl, { waitUntil: "load" });
await page.selectOption("#puzzleTypeSelect", "ORDERING");
await page.waitForSelector("#ord-i1", { timeout: 10000 });
await page.fill("#ord-i1", "Ouvrir le fichier");
await page.fill("#ord-i2", "Corriger la formule");
await page.click("main form button[type=submit]");
await page.waitForFunction(() => document.body.innerText.includes("Étape enregistrée"), null, { timeout: 30000 });
await page.reload({ waitUntil: "load" });
check("ordering saved and reloaded", (await page.inputValue("#puzzleTypeSelect")) === "ORDERING" && (await page.inputValue("#ord-i1")) === "Ouvrir le fichier");

// Prévisualisation
await page.goto(base + `/app/games/${gameId}/preview`, { waitUntil: "load" });
check("preview lists steps", (await page.locator("nav[aria-label='Étapes de la prévisualisation'] li").count()) === 3);
check("preview validate disabled", await page.locator("button", { hasText: "Valider" }).isDisabled());
await page.locator("nav[aria-label='Étapes de la prévisualisation'] button").nth(2).click();
check("preview shows ordering input", (await page.textContent("main")).includes("Remettez dans le bon ordre"));
check("answer hidden by default", !(await page.textContent("main")).includes("Ouvrir le fichier → Corriger la formule"));
await page.locator("button", { hasText: "Afficher" }).click();
check("trainer can reveal answer", (await page.textContent("main")).includes("Ouvrir le fichier → Corriger la formule"));
await shot(page, "e2e-preview.png", { fullPage: true });

// Ownership : un autre formateur ne voit pas l'étape
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(base + "/register", { waitUntil: "load" });
await p2.fill("#firstName", "Autre"); await p2.fill("#lastName", "Form"); await p2.fill("#email", `sb${Date.now()}@example.com`); await p2.fill("#password", "Secret123"); await p2.check("input[name=acceptTerms]");
await Promise.all([p2.waitForURL(/\/app$/), p2.click("button[type=submit]")]);
const rOther = await p2.goto(stepUrl, { waitUntil: "load" });
check("other trainer gets 404 on foreign step", rOther.status() === 404, String(rOther.status()));
await ctx2.close();

// Mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(base + "/login", { waitUntil: "load" });
await mp.fill("#email", "formateur@escapeclass.dev"); await mp.fill("#password", "Formateur1234!");
await Promise.all([mp.waitForURL(/\/app$/), mp.click("button[type=submit]")]);
await mp.goto(stepUrl, { waitUntil: "load" });
check("mobile step editor no overflow", !(await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
await mp.goto(base + `/app/games/${gameId}/preview`, { waitUntil: "load" });
check("mobile preview no overflow", !(await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
await shot(mp, "e2e-preview-mobile.png", { fullPage: true });
await m.close();

await ctx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
