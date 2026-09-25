// Audit d'accessibilité (PHASE 19) : axe-core sur les pages clés, en desktop
// et en mobile, plus quelques vérifications manuelles (clavier, zoom, focus).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
if (process.env.SEED !== "0") execFileSync("npx", ["tsx", "tests/fixtures/seed-test-games.ts"], { stdio: "inherit" });

const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };

async function audit(page, label) {
  // Laisser les animations d'entrée se terminer (fade-up : 0,5 s) : sinon axe
  // mesure un contraste transitoire au lieu de l'état stable.
  await page.waitForTimeout(700);
  await page.addScriptTag({ content: AXE });
  const violations = await page.evaluate(async () => {
    // @ts-expect-error axe est injecté dans la page
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, target: v.nodes[0]?.target?.join(" ") ?? "" }));
  });
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  if (violations.length > 0) {
    for (const v of violations) console.log(`      ${v.impact} · ${v.id} (${v.nodes}) · ${v.help} · ${v.target}`);
  }
  check(`axe: ${label}`, serious.length === 0, serious.length ? `${serious.length} problème(s) sérieux` : "aucun problème sérieux");
  return violations;
}

/* ------------------------------------------------------------ pages publiques */
for (const [w, h, label] of [[1366, 900, "desktop"], [390, 844, "mobile"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  for (const path of ["/", "/demo", "/login", "/register", "/join"]) {
    await page.goto(base + path, { waitUntil: "load" });
    await audit(page, `${path} (${label})`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    check(`no horizontal overflow: ${path} (${label})`, !overflow);
  }
  await ctx.close();
}

/* ------------------------------------------------------------ espace formateur */
const trainerCtx = await browser.newContext({ viewport: { width: 1366, height: 1000 } });
const trainer = await trainerCtx.newPage();
trainer.on("dialog", (d) => d.accept());
await trainer.goto(base + "/login", { waitUntil: "load" });
await trainer.fill("#email", "formateur@escapeclass.dev"); await trainer.fill("#password", "Formateur1234!");
await Promise.all([trainer.waitForURL(/\/app$/), trainer.click("button[type=submit]")]);

await trainer.goto(base + "/app/games", { waitUntil: "load" });
await trainer.locator("article", { hasText: "Jeu publiable" }).locator("a", { hasText: "Ouvrir" }).click();
await trainer.waitForURL(/\/app\/games\/[a-z0-9]+$/);
const gameId = trainer.url().split("/").pop();
const stepHref = await trainer.locator(`a[href^="/app/games/${gameId}/steps/"]`).first().getAttribute("href");

for (const path of ["/app", "/app/games", "/app/games/new", "/app/games/generate", "/app/skills", "/app/settings", "/app/sessions", `/app/games/${gameId}`, `/app/games/${gameId}/edit`, `/app/games/${gameId}/settings`, `/app/games/${gameId}/steps`, stepHref, `/app/games/${gameId}/preview`, `/app/games/${gameId}/stats`]) {
  await trainer.goto(base + path, { waitUntil: "load" });
  await audit(trainer, path);
}

/* --------------------------------------------------------- parcours apprenant */
// Publier avant de pouvoir lancer une session
await trainer.goto(base + `/app/games/${gameId}`, { waitUntil: "load" });
const publishBtn = trainer.locator("button", { hasText: "Publier" });
if ((await publishBtn.count()) > 0) {
  await publishBtn.click();
  await trainer.waitForFunction(() => document.body.textContent.includes("Lancer une session"), null, { timeout: 30000 });
}
await trainer.goto(base + `/app/games/${gameId}/launch`, { waitUntil: "load" });
await trainer.locator("button", { hasText: "Lancer une session" }).click();
await trainer.waitForURL(/\/app\/sessions\/[a-z0-9]+$/, { timeout: 30000 });
const sessionId = trainer.url().split("/").pop();
const code = (await trainer.locator("aside .font-mono").first().textContent()).trim();
await audit(trainer, "/app/sessions/[id] (live)");

const learnerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const learner = await learnerCtx.newPage();
await learner.goto(base + `/join/${code}`, { waitUntil: "load" });
await audit(learner, "/join/[code] (mobile)");
await learner.fill("#firstName", "Ada"); await learner.fill("#displayName", "Ada A11y");
await learner.click("main form button[type=submit]");
await learner.waitForURL(new RegExp(`/play/${code}$`), { timeout: 30000 });
await audit(learner, "/play/[code] lobby (mobile)");

await trainer.locator("button", { hasText: "Démarrer la mission" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Étape 1"), null, { timeout: 30000 });
await audit(learner, "/play/[code] en jeu (mobile)");

// Clavier : résoudre une étape sans souris
await learner.keyboard.press("Tab");
const reachedInput = await learner.evaluate(() => {
  const active = document.activeElement;
  return Boolean(active && active !== document.body);
});
check("keyboard focus enters the play screen", reachedInput);
await learner.locator("input.input-code").focus();
await learner.keyboard.type("4729");
await learner.keyboard.press("Tab");
const onValidate = await learner.evaluate(() => document.activeElement?.textContent?.includes("Valider") ?? false);
check("tab order reaches the validate button", onValidate);
await learner.keyboard.press("Enter");
await learner.waitForFunction(() => document.body.textContent.includes("Étape 2"), null, { timeout: 30000 });
check("step solved with keyboard only", true);

// Zoom 200 % (WCAG 1.4.4) sans débordement horizontal
await learner.setViewportSize({ width: 390, height: 844 });
await learner.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
const zoomOverflow = await learner.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
check("no horizontal overflow at 200% text zoom", !zoomOverflow);
await learner.evaluate(() => { document.documentElement.style.fontSize = ""; });

// Contraste et focus visible vérifiés par axe ci-dessus ; ici l'anneau de focus
const focusVisible = await learner.evaluate(() => {
  const btn = document.querySelector("main button");
  if (!btn) return false;
  (btn).focus();
  const style = getComputedStyle(btn, ":focus-visible");
  return style.outlineStyle !== "none" || style.outlineWidth !== "0px";
});
check("focus ring is visible on buttons", focusVisible);

// Préférence de mouvement réduit respectée
const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const rp = await reduced.newPage();
await rp.goto(base + "/", { waitUntil: "load" });
const animationDisabled = await rp.evaluate(() => {
  const el = document.querySelector(".animate-fade-up");
  if (!el) return true;
  return parseFloat(getComputedStyle(el).animationDuration) < 0.05;
});
check("animations disabled under prefers-reduced-motion", animationDisabled);
await reduced.close();

// Rapport apprenant
await learner.fill("input.input-code", "EXCEL");
await learner.locator("button", { hasText: "Valider" }).click();
await learner.waitForFunction(() => document.body.textContent.includes("Mission accomplie"), null, { timeout: 30000 });
await audit(learner, "/play/[code] fin de mission (mobile)");
await learner.goto(base + `/play/${code}/result`, { waitUntil: "load" });
await audit(learner, "/play/[code]/result (mobile)");

await trainer.goto(base + `/app/sessions/${sessionId}/results`, { waitUntil: "load" });
await audit(trainer, "/app/sessions/[id]/results");

await learnerCtx.close();
await trainerCtx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
