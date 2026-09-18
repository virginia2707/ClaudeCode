// Prérequis : `playwright` installé (npm i -D playwright) ou PLAYWRIGHT_MODULE pointant vers son index.mjs,
// et un serveur EscapeClass démarré (BASE, défaut http://localhost:3100) avec la base seedée (npm run seed).
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.BASE ?? "http://localhost:3100";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
const shot = (page, name, opts = {}) => page.screenshot({ ...opts, ...(process.env.SHOT_DIR ? { path: process.env.SHOT_DIR + "/" + name } : {}) });
const check = (name, ok, extra = "") => { results.push({ name, ok, extra }); console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); };

async function fresh(vp = { width: 1366, height: 900 }) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  return { ctx, page };
}

// 1. Inscription formateur -> /app
{
  const { ctx, page } = await fresh();
  const email = `t${Date.now()}@example.com`;
  await page.goto(base + "/register", { waitUntil: "load" });
  await page.fill("#firstName", "Nadia");
  await page.fill("#lastName", "Test");
  await page.fill("#email", email);
  await page.fill("#password", "Secret123");
  await page.check("input[name=acceptTerms]");
  await Promise.all([page.waitForURL(/\/app$/, { timeout: 30000 }), page.click("button[type=submit]")]);
  check("register trainer redirects to /app", page.url().endsWith("/app"), page.url());
  const h1 = await page.locator("h1").textContent();
  check("dashboard greets by first name", h1?.includes("Nadia"), h1 ?? "");
  // /admin forbidden for trainer
  const res = await page.goto(base + "/admin", { waitUntil: "load" });
  const body = await page.textContent("body");
  check("trainer on /admin gets 403", res.status() === 403 && body.includes("accès"), String(res.status()));
  await shot(page, "e2e-403.png");
  // login page redirects when already authenticated
  await page.goto(base + "/login", { waitUntil: "load" });
  check("authenticated /login redirects to /app", page.url().endsWith("/app"), page.url());
  // logout
  await page.goto(base + "/app", { waitUntil: "load" });
  await Promise.all([page.waitForURL(/\/$/, { timeout: 30000 }), page.locator("form button:has-text('Déconnexion')").first().click()]);
  check("logout redirects to /", page.url() === base + "/", page.url());
  await page.goto(base + "/app", { waitUntil: "load" });
  check("after logout /app redirects to /login", page.url().includes("/login?next=%2Fapp"), page.url());
  // duplicate email
  await page.goto(base + "/register", { waitUntil: "load" });
  await page.fill("#firstName", "Nadia"); await page.fill("#lastName", "Test"); await page.fill("#email", email); await page.fill("#password", "Secret123"); await page.check("input[name=acceptTerms]");
  await page.click("button[type=submit]");
  await page.waitForSelector("#email-error", { timeout: 30000 });
  check("duplicate email shows field error", (await page.textContent("#email-error")).includes("existe déjà"));
  await ctx.close();
}

// 2. Validation errors on register (weak password, no terms)
{
  const { ctx, page } = await fresh({ width: 390, height: 844 });
  await page.goto(base + "/register", { waitUntil: "load" });
  await page.fill("#firstName", "A"); await page.fill("#lastName", "B"); await page.fill("#email", "weak@example.com"); await page.fill("#password", "abcdefgh");
  await page.click("button[type=submit]");
  await page.waitForSelector("#password-error", { timeout: 30000 });
  check("weak password error (mobile)", (await page.textContent("#password-error")).includes("chiffre"));
  check("terms error", (await page.locator("#acceptTerms-error").count()) === 1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  check("register mobile no horizontal overflow", !overflow);
  await shot(page, "e2e-register-mobile.png", { fullPage: true });
  await ctx.close();
}

// 3. Login wrong password, then admin login -> /admin, then next= redirect
{
  const { ctx, page } = await fresh();
  await page.goto(base + "/login", { waitUntil: "load" });
  await page.fill("#email", "admin@escapeclass.dev"); await page.fill("#password", "wrong");
  await page.click("button[type=submit]");
  await page.waitForSelector("form [role=alert]", { timeout: 30000 });
  check("wrong password shows generic error", (await page.textContent("form [role=alert]")).includes("incorrect"));
  await page.fill("#password", "Admin1234!");
  await Promise.all([page.waitForURL(/\/admin$/, { timeout: 30000 }), page.click("button[type=submit]")]);
  check("admin login redirects to /admin", page.url().endsWith("/admin"));
  const stats = await page.locator("main .card-2").count();
  check("admin sees 4 stats", stats === 4, String(stats));
  await shot(page, "e2e-admin.png");
  // admin can access /app too
  const r = await page.goto(base + "/app", { waitUntil: "load" });
  check("admin can open /app", r.status() === 200);
  await ctx.close();
}
{
  const { ctx, page } = await fresh();
  await page.goto(base + "/login?next=%2Fapp%2Fgames", { waitUntil: "load" });
  await page.fill("#email", "formateur@escapeclass.dev"); await page.fill("#password", "Formateur1234!");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/app\/games/, { timeout: 30000 }).catch(() => {});
  check("login honors next= (internal path)", page.url().includes("/app/games"), page.url());
  await ctx.close();
}
{
  // open redirect attempt
  const { ctx, page } = await fresh();
  await page.goto(base + "/login?next=https%3A%2F%2Fevil.example", { waitUntil: "load" });
  await page.fill("#email", "formateur@escapeclass.dev"); await page.fill("#password", "Formateur1234!");
  await Promise.all([page.waitForURL(/\/app$/, { timeout: 30000 }), page.click("button[type=submit]")]);
  check("external next= is ignored", page.url().endsWith("/app"), page.url());
  await shot(page, "e2e-trainer-dashboard.png");
  await ctx.close();
}

// 4. Learner login -> /join ; join lookup with unknown code
{
  const { ctx, page } = await fresh({ width: 390, height: 844 });
  await page.goto(base + "/login", { waitUntil: "load" });
  await page.fill("#email", "apprenant@escapeclass.dev"); await page.fill("#password", "Apprenant1234!");
  await Promise.all([page.waitForURL(/\/join$/, { timeout: 30000 }), page.click("button[type=submit]")]);
  check("learner login redirects to /join", page.url().endsWith("/join"));
  await page.fill("#code", "abc123");
  await page.click("button[type=submit]");
  await page.waitForSelector("form [role=alert]", { timeout: 30000 });
  check("unknown session code shows error", (await page.textContent("form [role=alert]")).includes("Aucune session"));
  await page.fill("#code", "ab");
  await page.click("button[type=submit]");
  await page.waitForFunction(() => document.querySelector("form [role=alert]")?.textContent?.includes("6 lettres"), null, { timeout: 30000 });
  check("short code shows format error", true);
  const r = await page.goto(base + "/app", { waitUntil: "load" });
  check("learner on /app gets 403", r.status() === 403);
  await shot(page, "e2e-join-mobile.png", { fullPage: true });
  await ctx.close();
}

// 5. Forged cookie is rejected
{
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "escapeclass_session", value: "forged.token.value", domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(base + "/app", { waitUntil: "load" });
  check("forged cookie redirected to /login", page.url().includes("/login"), page.url());
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
