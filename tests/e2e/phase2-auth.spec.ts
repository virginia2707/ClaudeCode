import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: "admin@missionia.dev", password: "Admin1234!" };
const TRAINER = { email: "formateur@missionia.dev", password: "Formateur1234!" };
const LEARNER = { email: "apprenant@missionia.dev", password: "Apprenant1234!" };
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Compte dédié par projet : les tests de changement de rôle ne se marchent pas dessus. */
const MUTABLE = {
  desktop: { email: "membre-desktop@missionia.dev", name: "Marc Mutable" },
  mobile: { email: "membre-mobile@missionia.dev", name: "Mina Mutable" },
} as const;

/** Alerte du formulaire, en excluant l'annonceur de route de Next.js. */
const formAlert = (page: Page) => page.getByRole("alert").filter({ hasNotText: "" }).first();

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Mot de passe").fill(who.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app\//);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Déconnexion" }).first().click();
  await page.waitForURL(/\/login$/);
}

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
}

test.describe("protection des routes", () => {
  test("une route /app sans session redirige vers /login avec next", async ({ page }) => {
    await page.goto("/app/trainer");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Ftrainer/);
  });

  test("la page de connexion est accessible", async ({ page }) => {
    await page.goto("/login");
    await noSeriousA11y(page);
  });
});

test.describe("connexion", () => {
  test("mot de passe erroné : message générique, pas de session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TRAINER.email);
    await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe1");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(formAlert(page)).toContainText("Email ou mot de passe incorrect.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("formateur → /app/trainer, sans accès à l'administration", async ({ page }) => {
    await login(page, TRAINER);
    await expect(page).toHaveURL(/\/app\/trainer$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour Farid");
    await expect(page.getByRole("link", { name: "Organisation" })).toHaveCount(0);
    await page.goto("/app/admin");
    await expect(page).toHaveURL(/\/app\/trainer$/);
    await logout(page);
  });

  test("apprenant → /app/learn, redirigé hors de l'espace formateur", async ({ page }) => {
    await login(page, LEARNER);
    await expect(page).toHaveURL(/\/app\/learn$/);
    await page.goto("/app/trainer");
    await expect(page).toHaveURL(/\/app\/learn$/);
    await page.goto("/app/admin");
    await expect(page).toHaveURL(/\/app\/learn$/);
  });

  test("le paramètre next est respecté et les redirections externes bloquées", async ({ page }) => {
    await page.goto("/login?next=https://evil.example");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Mot de passe").fill(ADMIN.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/app\//);
    expect(new URL(page.url()).host).toContain("localhost");
  });

  test("un utilisateur connecté est renvoyé de /login vers /app", async ({ page }) => {
    await login(page, LEARNER);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/app\/learn$/);
  });
});

test.describe("inscription", () => {
  test("valide les champs côté serveur", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Nom complet").fill("A");
    await page.getByLabel("Email").fill("pas-un-email");
    await page.getByLabel("Mot de passe").fill("court");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Indiquez votre nom.")).toBeVisible();
    await expect(page.getByText("Adresse email invalide.")).toBeVisible();
    await expect(page.getByText("10 caractères minimum.")).toBeVisible();
    await expect(page.getByText(/Indiquez le nom de votre organisation/)).toBeVisible();
  });

  test("un formateur crée son organisation et arrive sur son tableau de bord", async ({ page }) => {
    const email = `trainer-${uid()}@e2e.dev`;
    await page.goto("/register");
    await page.getByLabel("Nom complet").fill("Nadia Testeuse");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Organisation", exact: true }).fill("Académie E2E");
    await page.getByLabel("Mot de passe").fill("motdepasse-solide1");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page).toHaveURL(/\/app\/trainer$/);
    await expect(page.getByRole("main").getByText("Académie E2E")).toBeVisible();
    await expect(page.getByRole("link", { name: "Organisation" })).toBeVisible();
    await page.getByRole("link", { name: "Organisation" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Académie E2E");
    await expect(page.getByText("user.register")).toBeVisible();
    await noSeriousA11y(page);
    await logout(page);
    // reconnexion avec le compte créé
    await login(page, { email, password: "motdepasse-solide1" });
    await expect(page).toHaveURL(/\/app\/trainer$/);
  });

  test("un email déjà utilisé est refusé", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Nom complet").fill("Doublon");
    await page.getByLabel("Email").fill(TRAINER.email);
    await page.getByRole("textbox", { name: "Organisation", exact: true }).fill("Doublon Org");
    await page.getByLabel("Mot de passe").fill("motdepasse-solide1");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText(/Un compte existe déjà/)).toBeVisible();
  });

  test("un apprenant sans invitation arrive sur /app/join et peut créer une organisation", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("radio", { name: /Apprenant/ }).check();
    await page.getByLabel("Nom complet").fill("Léo Solo");
    await page.getByLabel("Email").fill(`solo-${uid()}@e2e.dev`);
    await page.getByLabel("Mot de passe").fill("motdepasse-solide1");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page).toHaveURL(/\/app\/join$/);
    await page.getByRole("textbox", { name: "Nom de l'organisation" }).fill("Studio Solo");
    await page.getByRole("button", { name: "Créer mon organisation" }).click();
    await expect(page).toHaveURL(/\/app\/trainer$/);
    await expect(page.getByRole("main").getByText("Studio Solo")).toBeVisible();
  });
});

test.describe("administration et invitations", () => {
  test.describe.configure({ mode: "serial" });

  test("un admin invite un apprenant, qui crée son compte via le lien", async ({ page, browser }) => {
    const invitee = `invite-${uid()}@e2e.dev`;
    await login(page, ADMIN);
    await page.goto("/app/admin");
    const inviteForm = page.getByRole("form", { name: "Inviter un membre" });
    await inviteForm.getByRole("textbox", { name: "Email" }).fill(invitee);
    await inviteForm.getByRole("combobox", { name: "Rôle", exact: true }).selectOption("LEARNER");
    await inviteForm.getByRole("button", { name: "Inviter" }).click();
    await expect(page.getByRole("status")).toContainText("Invitation créée");
    const link = await page.getByLabel(`Lien d'invitation pour ${invitee}`).inputValue();
    expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]+$/);

    // Navigateur "propre" pour l'invité
    const ctx = await browser.newContext();
    const invited = await ctx.newPage();
    await invited.goto(link);
    await expect(invited.getByRole("heading", { level: 1 })).toContainText("Rejoindre NovaSkills Formation");
    await expect(invited.getByLabel("Email")).toHaveValue(invitee);
    await invited.getByLabel("Nom complet").fill("Invité Test");
    await invited.getByLabel("Mot de passe").fill("motdepasse-solide1");
    await invited.getByRole("button", { name: "Créer mon compte et rejoindre" }).click();
    await expect(invited).toHaveURL(/\/app\/learn$/);
    await expect(invited.getByRole("main").getByText("NovaSkills Formation")).toBeVisible();
    // Le lien ne peut pas être réutilisé
    await invited.goto(link);
    await expect(invited.getByRole("heading", { level: 1 })).toContainText("invalide ou expirée");
    await ctx.close();

    // L'invitation n'apparaît plus en attente et l'audit la trace
    await page.reload();
    await expect(page.getByText(invitee)).toHaveCount(1); // uniquement dans la liste des membres
    await expect(page.getByText("member.invite").first()).toBeVisible();
  });

  test("un admin ne peut pas se retirer son dernier rôle admin ni se désactiver", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/app/admin");
    const row = page.locator("li", { hasText: "Alice Admin" }).first();
    await expect(row.getByRole("button", { name: "Désactiver" })).toHaveCount(0);
    await row.getByLabel("Rôle de Alice Admin").selectOption("LEARNER");
    await row.getByRole("button", { name: "Modifier" }).click();
    await expect(row.getByRole("status")).toContainText("dernier administrateur");
  });

  test("un admin change le rôle d'un membre puis le rétablit", async ({ page }, testInfo) => {
    const member = MUTABLE[testInfo.project.name as keyof typeof MUTABLE];
    await login(page, ADMIN);
    await page.goto("/app/admin");
    const row = page.locator("li", { hasText: member.name }).first();
    await row.getByLabel(`Rôle de ${member.name}`).selectOption("TRAINER");
    await row.getByRole("button", { name: "Modifier" }).click();
    await expect(row.getByRole("status")).toContainText("Rôle mis à jour.");
    await expect(row.locator(".badge", { hasText: "Formateur" })).toBeVisible();
    await row.getByLabel(`Rôle de ${member.name}`).selectOption("LEARNER");
    await row.getByRole("button", { name: "Modifier" }).click();
    await expect(row.locator(".badge", { hasText: "Apprenant" })).toBeVisible();
  });

  test("un admin désactive puis réactive un membre", async ({ page }, testInfo) => {
    const member = MUTABLE[testInfo.project.name as keyof typeof MUTABLE];
    await login(page, ADMIN);
    await page.goto("/app/admin");
    const row = page.locator("li", { hasText: member.name }).first();
    await row.getByRole("button", { name: "Désactiver" }).click();
    await expect(row.locator(".badge", { hasText: "désactivé" })).toBeVisible();
    await row.getByRole("button", { name: "Réactiver" }).click();
    await expect(row.locator(".badge", { hasText: "désactivé" })).toHaveCount(0);
  });
});
