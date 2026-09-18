// Scénario E2E création / modification / réglages d'un Escape Game (PHASE 4) + upload.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };
const shot = (page, name, opts = {}) => page.screenshot({ ...opts, ...(process.env.SHOT_DIR ? { path: process.env.SHOT_DIR + "/" + name } : {}) });

// Upload sans authentification -> 401
{
  const ctx = await browser.newContext();
  const r = await ctx.request.post(base + "/api/uploads", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) } } });
  check("upload unauthenticated -> 401", r.status() === 401, String(r.status()));
  await ctx.close();
}

const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(base + "/login", { waitUntil: "load" });
await page.fill("#email", "formateur@escapeclass.dev"); await page.fill("#password", "Formateur1234!");
await Promise.all([page.waitForURL(/\/app$/), page.click("button[type=submit]")]);

// Upload authentifié : type refusé, puis image acceptée et servie
{
  const bad = await ctx.request.post(base + "/api/uploads", { multipart: { file: { name: "x.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") } } });
  check("upload forbidden type -> 415", bad.status() === 415, String(bad.status()));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const good = await ctx.request.post(base + "/api/uploads", { multipart: { file: { name: "cover.png", mimeType: "image/png", buffer: png } } });
  check("upload png -> 201", good.status() === 201, String(good.status()));
  const json = await good.json();
  const served = await ctx.request.get(base + json.url);
  check("uploaded file served with image/png", served.status() === 200 && served.headers()["content-type"] === "image/png");
  const missing = await ctx.request.get(base + "/api/files/doesnotexist.png");
  check("unknown file -> 404", missing.status() === 404);
  const traversal = await ctx.request.get(base + "/api/files/..%2F..%2Fpackage.json");
  check("path traversal rejected", traversal.status() === 404 || traversal.status() === 400, String(traversal.status()));
}

// Création : validation
await page.goto(base + "/app/games/new", { waitUntil: "load" });
await page.fill("#title", "ab");
await page.fill("#estimatedMinutes", "2");
await page.click("main form button[type=submit]");
await page.waitForSelector("#title-error", { timeout: 30000 });
check("create: title error shown", (await page.textContent("#title-error")).includes("trop court"));
check("create: duration error shown", (await page.locator("#estimatedMinutes-error").count()) === 1);
check("create: values preserved after error", (await page.inputValue("#title")) === "ab");

// Création : succès -> redirection vers le step builder
const title = "Mission Excel E2E " + Date.now();
await page.fill("#title", title);
await page.fill("#description", "Description de test");
await page.selectOption("#category", "BUREAUTIQUE");
await page.selectOption("#level", "ADVANCED");
await page.fill("#estimatedMinutes", "30");
await page.fill("#objective", "Maîtriser les formules");
await page.fill("#targetSkills", "Formules simples, Références absolues, Formules simples");
await page.fill("#scenario", "Il est 16h30…");
await page.selectOption("#mode", "TEAM");
await page.fill("#maxParticipants", "12");
await page.click("main form button[type=submit]");
await page.waitForURL(/\/app\/games\/[a-z0-9]+\/steps\?created=1/, { timeout: 30000 });
check("create: redirects to step builder", true, page.url());
const gameId = page.url().match(/games\/([a-z0-9]+)\//)[1];

// Synthèse et compétences créées
await page.goto(base + `/app/games/${gameId}`, { waitUntil: "load" });
const main = await page.textContent("main");
check("overview shows title, level and team mode", main.includes(title) && main.includes("Avancé") && main.includes("En équipe"));
await page.goto(base + "/app/skills", { waitUntil: "load" });
const skillsText = await page.textContent("main");
check("target skills added to library", skillsText.includes("Formules simples") && skillsText.includes("Références absolues"));

// Édition
await page.goto(base + `/app/games/${gameId}/edit`, { waitUntil: "load" });
check("edit form prefilled", (await page.inputValue("#title")) === title && (await page.inputValue("#targetSkills")).includes("Références absolues"));
await page.fill("#title", title + " (modifié)");
await page.click("main form button[type=submit]");
await page.waitForFunction(() => document.body.innerText.includes("Modifications enregistrées"), null, { timeout: 30000 });
await page.goto(base + `/app/games/${gameId}`, { waitUntil: "load" });
check("edit persisted", (await page.textContent("h1")).includes("(modifié)"));
await shot(page, "e2e-game-form-edit.png", { fullPage: true });

// Réglages : erreur puis succès
await page.goto(base + `/app/games/${gameId}/settings`, { waitUntil: "load" });
check("settings prefilled with estimated minutes", (await page.inputValue("#maxMinutes")) === "30");
await page.fill("#maxMinutes", "");
await page.click("main form button[type=submit]");
await page.waitForSelector("#maxMinutes-error", { timeout: 30000 });
check("settings: missing duration error", (await page.textContent("#maxMinutes-error")).includes("durée"));
await page.selectOption("#timerMode", "NONE");
check("settings: duration disabled without timer", await page.locator("#maxMinutes").isDisabled());
await page.selectOption("#timerMode", "GLOBAL");
await page.fill("#maxMinutes", "60");
await page.uncheck("input[name=timeBonusEnabled]");
await page.selectOption("#leaderboardMethod", "SCORE");
await page.click("main form button[type=submit]");
await page.waitForFunction(() => document.body.innerText.includes("Réglages enregistrés"), null, { timeout: 30000 });
await page.goto(base + `/app/games/${gameId}/settings`, { waitUntil: "load" });
check("settings persisted", (await page.inputValue("#maxMinutes")) === "60" && !(await page.isChecked("input[name=timeBonusEnabled]")) && (await page.inputValue("#leaderboardMethod")) === "SCORE");
await shot(page, "e2e-settings.png", { fullPage: true });

// Upload via le formulaire (widget)
await page.goto(base + `/app/games/${gameId}/edit`, { waitUntil: "load" });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
await page.setInputFiles("input[type=file]", { name: "cover.png", mimeType: "image/png", buffer: png });
await page.waitForSelector("img[src^='/api/files/']", { timeout: 30000 });
check("cover upload widget shows preview", true);
await page.click("main form button[type=submit]");
await page.waitForFunction(() => document.body.innerText.includes("Modifications enregistrées"), null, { timeout: 30000 });
await page.goto(base + "/app/games", { waitUntil: "load" });
check("cover displayed on game card", (await page.locator("article img[src^='/api/files/']").count()) >= 1);

// Mobile : formulaire de création sans débordement
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(base + "/login", { waitUntil: "load" });
await mp.fill("#email", "formateur@escapeclass.dev"); await mp.fill("#password", "Formateur1234!");
await Promise.all([mp.waitForURL(/\/app$/), mp.click("button[type=submit]")]);
await mp.goto(base + "/app/games/new", { waitUntil: "load" });
check("mobile new game form no overflow", !(await mp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
await shot(mp, "e2e-new-game-mobile.png", { fullPage: true });
await m.close();

await ctx.close();
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
