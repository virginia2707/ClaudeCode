// Scénario E2E sécurité et anti-triche (PHASE 20).
// Vérifie ce que le serveur envoie réellement et ce qu'il refuse.
import { execFileSync } from "node:child_process";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
if (process.env.SEED !== "0") execFileSync("npx", ["tsx", "tests/fixtures/seed-test-games.ts"], { stdio: "inherit" });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };

/* ------------------------------------------------ routes privées sans session */
{
  const ctx = await browser.newContext();
  for (const path of ["/app", "/app/games", "/app/sessions", "/app/settings", "/admin"]) {
    const r = await ctx.request.get(base + path, { maxRedirects: 0 });
    check(`unauthenticated ${path} redirects to login`, r.status() === 307 && (r.headers().location ?? "").includes("/login"), String(r.status()));
  }
  const upload = await ctx.request.post(base + "/api/uploads", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from([137, 80]) } } });
  check("unauthenticated upload rejected", upload.status() === 401);
  await ctx.close();
}

/* --------------------------------------------- en-têtes de sécurité HTTP */
{
  const ctx = await browser.newContext();
  const r = await ctx.request.get(base + "/");
  const h = r.headers();
  check("X-Frame-Options set", h["x-frame-options"] === "SAMEORIGIN", h["x-frame-options"]);
  check("X-Content-Type-Options set", h["x-content-type-options"] === "nosniff");
  check("Referrer-Policy set", (h["referrer-policy"] ?? "").includes("strict-origin"));
  check("Permissions-Policy set", Boolean(h["permissions-policy"]));
  await ctx.close();
}

/* --------------------------------------------------- préparation d'une session */
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
await trainer.locator("button", { hasText: "Démarrer la mission" }).click();
await trainer.waitForFunction(() => document.body.textContent.includes("En cours"), null, { timeout: 30000 });

const learnerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const learner = await learnerCtx.newPage();
await learner.goto(base + `/join/${code}`, { waitUntil: "load" });
await learner.fill("#firstName", "Eve"); await learner.fill("#displayName", "Eve Sec");
await learner.click("main form button[type=submit]");
await learner.waitForURL(new RegExp(`/play/${code}$`), { timeout: 30000 });
await learner.waitForFunction(() => document.body.textContent.includes("Étape 1"), null, { timeout: 30000 });

/* ------------------------------- le serveur ne divulgue jamais les réponses */
{
  const html = await learnerCtx.request.get(base + `/play/${code}`).then((r) => r.text());
  check("answer of current step absent from served payload", !html.includes("4729"), html.includes("4729") ? "FUITE" : "");
  // Les TITRES des étapes suivantes sont servis volontairement (barre de
  // progression de la mission) ; leurs RÉPONSES ne doivent jamais l'être.
  check("later step answer absent from served payload", !html.includes("EXCEL"), html.includes("EXCEL") ? "FUITE" : "");
  check("later step prompt absent from served payload", !html.includes("Quel mot ?"), html.includes("Quel mot ?") ? "FUITE" : "");
  check("step titles are served for the progress rail", html.includes("Étape B"));
  check("hint text not served before it is unlocked", !html.includes("Regardez la colonne Total"));
  const dom = await learner.content();
  check("no answer in the rendered DOM", !dom.includes("4729"));
  check("hint costs are visible, hint texts are not", dom.includes("−10 pts") && !dom.includes("Utilisez la formule SOMME"));
}

/* ------------------------------------------------- anti-triche : progression */
{
  // Tenter de forcer le score dans le DOM ne change rien côté serveur.
  await learner.evaluate(() => {
    const el = document.querySelector("header [data-score]");
    if (el) el.textContent = "99999 pts";
  });
  await learner.reload({ waitUntil: "load" });
  const score = await learner.locator("header [data-score]").getAttribute("data-score");
  check("client-side score tampering has no effect", score === "0", String(score));
}

/* ----------------------------------------- limitation de débit sur les réponses */
{
  let blocked = false;
  for (let i = 0; i < 34 && !blocked; i++) {
    await learner.fill("input.input-code", String(1000 + i));
    await learner.locator("button", { hasText: "Valider" }).click();
    await learner.waitForTimeout(80);
    const text = await learner.textContent("main");
    if (text.includes("Trop de tentatives")) blocked = true;
  }
  check("answer submissions are rate limited", blocked);
}

/* ------------------------------------ isolation : jeton d'un autre participant */
{
  const other = await browser.newContext();
  const op = await other.newPage();
  await op.goto(base + `/join/${code}`, { waitUntil: "load" });
  await op.fill("#firstName", "Mal"); await op.fill("#displayName", "Mal Sec");
  await op.click("main form button[type=submit]");
  await op.waitForURL(new RegExp(`/play/${code}$`), { timeout: 30000 });
  const otherScore = await op.locator("header [data-score]").getAttribute("data-score");
  check("each player has an isolated progress", otherScore === "0");

  // Cookie de participant forgé
  const forged = await browser.newContext();
  const cookies = await other.cookies();
  const playerCookie = cookies.find((c) => c.name.startsWith("escapeclass_player_"));
  check("player cookie is httpOnly", Boolean(playerCookie?.httpOnly));
  await forged.addCookies([{ name: playerCookie.name, value: "forged.jwt.value", domain: "localhost", path: "/" }]);
  const fp = await forged.newPage();
  await fp.goto(base + `/play/${code}`, { waitUntil: "load" });
  check("forged player token is rejected", fp.url().includes(`/join/${code}`), fp.url());
  await forged.close();
  await other.close();
}

/* --------------------------------------- flux temps réel d'une autre session */
{
  const stranger = await browser.newContext();
  const sse = await stranger.request.get(base + `/api/sessions/${sessionId}/events`);
  check("SSE of a session requires membership", sse.status() === 403, String(sse.status()));
  await stranger.close();
}

/* ------------------------------------------------ fichiers : accès et types */
{
  const traversal = await learnerCtx.request.get(base + "/api/files/..%2F..%2Fpackage.json");
  check("file path traversal blocked", traversal.status() === 404 || traversal.status() === 400, String(traversal.status()));
  const bogus = await learnerCtx.request.get(base + "/api/files/dev.db");
  check("arbitrary file name not served", bogus.status() === 404, String(bogus.status()));

  const exe = await trainerCtx.request.post(base + "/api/uploads", { multipart: { file: { name: "x.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") } } });
  check("executable upload rejected", exe.status() === 415, String(exe.status()));
  const html = await trainerCtx.request.post(base + "/api/uploads", { multipart: { file: { name: "x.html", mimeType: "text/html", buffer: Buffer.from("<script>alert(1)</script>") } } });
  check("html upload rejected", html.status() === 415, String(html.status()));
  const big = await trainerCtx.request.post(base + "/api/uploads", { multipart: { file: { name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(21 * 1024 * 1024) } } });
  check("oversized upload rejected", big.status() === 413, String(big.status()));
}

/* -------------------------------- cloisonnement entre formateurs (propriété) */
{
  const otherTrainer = await browser.newContext();
  const ot = await otherTrainer.newPage();
  await ot.goto(base + "/register", { waitUntil: "load" });
  await ot.fill("#firstName", "Autre"); await ot.fill("#lastName", "Form");
  await ot.fill("#email", `sec${Date.now()}@example.com`); await ot.fill("#password", "Secret123");
  await ot.check("input[name=acceptTerms]");
  await Promise.all([ot.waitForURL(/\/app$/), ot.click("button[type=submit]")]);
  for (const [path, label] of [
    [`/app/games/${gameId}`, "game overview"],
    [`/app/games/${gameId}/steps`, "step builder"],
    [`/app/games/${gameId}/stats`, "game stats"],
    [`/app/sessions/${sessionId}`, "live session"],
    [`/app/sessions/${sessionId}/results`, "session results"],
  ]) {
    const r = await ot.goto(base + path, { waitUntil: "load" });
    check(`another trainer cannot open ${label}`, r.status() === 404, String(r.status()));
  }
  const adminPage = await ot.goto(base + "/admin", { waitUntil: "load" });
  check("trainer cannot open admin area", adminPage.status() === 403, String(adminPage.status()));
  await otherTrainer.close();
}

/* --------------------------------- session terminée : plus aucune soumission */
{
  await trainer.goto(base + `/app/sessions/${sessionId}`, { waitUntil: "load" });
  await trainer.locator("button", { hasText: "Terminer la session" }).click();
  await trainer.waitForFunction(() => document.body.textContent.includes("Voir les résultats"), null, { timeout: 30000 });
  await learner.reload({ waitUntil: "load" });
  const text = await learner.textContent("main");
  check("ended session shows the end screen", text.includes("Mission terminée") || text.includes("Mission accomplie"));
  check("no answer input remains after the session ends", (await learner.locator("input.input-code").count()) === 0);
}

await learnerCtx.close();
await trainerCtx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
