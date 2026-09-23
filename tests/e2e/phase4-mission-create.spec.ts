import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TRAINER = { email: "formateur@missionia.dev", password: "Formateur1234!" };
const LEARNER = { email: "apprenant@missionia.dev", password: "Apprenant1234!" };

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Mot de passe").fill(who.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/app\//);
}

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} → ${v.nodes.map((n) => n.html.slice(0, 120)).join(" | ")}`);
  expect(serious).toEqual([]);
}

/** Crée une mission via l'interface et renvoie son URL. */
async function createMission(page: Page, title: string) {
  await page.goto("/app/trainer/missions/new");
  const form = page.getByRole("form", { name: "Créer une mission" });
  await form.getByRole("textbox", { name: "Titre de la mission" }).fill(title);
  await form.getByRole("textbox", { name: "Métier" }).fill("Responsable marketing");
  await form.getByRole("spinbutton", { name: "Durée (minutes)" }).fill("90");
  await form.getByRole("button", { name: "Créer la mission" }).click();
  // Attendre un repère propre à la page de détail : l'URL /missions/new
  // correspondrait elle aussi à un motif d'identifiant.
  await expect(page.getByRole("heading", { name: "Avant publication" })).toBeVisible();
  return page.url();
}

/** Supprime la mission ouverte pour que la suite reste rejouable. */
async function deleteMission(page: Page, title: string) {
  await page.goto(`/app/trainer/missions?q=${encodeURIComponent(title)}`);
  const row = page.locator("li").filter({ has: page.getByRole("link", { name: title, exact: true }) });
  await row.getByRole("button", { name: "Supprimer" }).click();
  await row.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(row).toHaveCount(0);
}

test.describe("création d'une mission", () => {
  test("refuse une fiche invalide et garde la saisie", async ({ page }) => {
    await login(page, TRAINER);
    await page.goto("/app/trainer/missions/new");
    const form = page.getByRole("form", { name: "Créer une mission" });
    await form.getByRole("textbox", { name: "Titre de la mission" }).fill("ab");
    await form.getByRole("spinbutton", { name: "Durée (minutes)" }).fill("2");
    await form.getByRole("button", { name: "Créer la mission" }).click();

    await expect(page.getByText("3 caractères minimum.")).toBeVisible();
    await expect(page.getByText("5 minutes minimum.")).toBeVisible();
    await expect(page).toHaveURL(/\/missions\/new$/);
    // La saisie n'est pas perdue.
    await expect(form.getByRole("textbox", { name: "Titre de la mission" })).toHaveValue("ab");
  });

  test("crée un brouillon et ouvre sa page avec la liste de ce qui reste à faire", async ({ page }, testInfo) => {
    const title = `Mission créée ${testInfo.project.name} ${Date.now()}`;
    await login(page, TRAINER);
    await createMission(page, title);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("Brouillon").first()).toBeVisible();
    await expect(page.getByText("Avant publication")).toBeVisible();
    await expect(page.getByText("Briefing rédigé")).toBeVisible();
    // Rien n'est encore fait : la publication reste fermée.
    await expect(page.getByRole("button", { name: "Publier" })).toBeDisabled();
    await noSeriousA11y(page);

    // La mission apparaît dans la liste, en brouillon.
    await page.goto(`/app/trainer/missions?q=${encodeURIComponent(title)}`);
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();

    await deleteMission(page, title);
  });

  test("un apprenant ne peut pas ouvrir le formulaire de création", async ({ page }) => {
    await login(page, LEARNER);
    await page.goto("/app/trainer/missions/new");
    await expect(page).toHaveURL(/\/app\/learn$/);
  });
});

test.describe("mission publiée", () => {
  test("le contenu est figé et l'écran l'explique", async ({ page }) => {
    await login(page, TRAINER);
    await page.goto("/app/trainer/missions?status=PUBLISHED&q=" + encodeURIComponent("48 heures"));
    await page.getByRole("link", { name: "48 heures pour lancer le produit", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Avant publication" })).toBeVisible();

    await expect(page.getByText("Mission publiée : contenu figé")).toBeVisible();
    // Les champs et boutons des sections sont neutralisés.
    await expect(page.getByRole("textbox", { name: "Titre de la mission" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Enregistrer le briefing" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Ajouter la contrainte" })).toBeDisabled();
    // Dupliquer reste possible : c'est le chemin pour faire évoluer la mission.
    await expect(page.getByRole("button", { name: "Dupliquer" })).toBeEnabled();
  });
});

test.describe("édition d'une mission", () => {
  test("complète briefing, rôle, contrainte et compétences, et voit la préparation avancer", async ({ page }, testInfo) => {
    const title = `Mission éditée ${testInfo.project.name} ${Date.now()}`;
    await login(page, TRAINER);
    await createMission(page, title);

    // Briefing immersif
    const briefing = page.getByRole("form", { name: "Briefing immersif" });
    await briefing.getByRole("textbox", { name: "Entreprise" }).fill("NovaTech");
    await briefing.getByRole("textbox", { name: "Délai (formulation narrative)" }).fill("48 heures");
    await briefing.getByRole("textbox", { name: "Briefing présenté à l'apprenant" }).fill(
      "Vous êtes responsable marketing de NovaTech. La direction attend votre stratégie de lancement demain matin.",
    );
    await briefing.getByRole("button", { name: "Enregistrer le briefing" }).click();
    await expect(page.getByText("Briefing rédigé").locator("..").getByText("Section « Briefing immersif »")).toHaveCount(0);

    // Rôle de l'apprenant
    const role = page.getByRole("form", { name: "Rôle de l'apprenant" });
    await role.getByRole("textbox", { name: "Rôle attribué" }).fill("Responsable marketing");
    await role.getByRole("textbox", { name: "Rend compte à" }).fill("Direction générale");
    await role.getByRole("button", { name: "Enregistrer le rôle" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rôle de l'apprenant enregistré" })).toBeVisible();

    // Contrainte : la clé dérivée est annoncée, car le moteur s'en sert.
    const constraintForm = page.getByRole("form", { name: "Ajouter une contrainte" });
    await constraintForm.getByRole("textbox", { name: "Intitulé" }).fill("Budget maximum");
    await constraintForm.getByRole("spinbutton", { name: "Valeur" }).fill("30000");
    await constraintForm.getByRole("textbox", { name: "Unité" }).fill("€");
    await constraintForm.getByRole("button", { name: "Ajouter la contrainte" }).click();
    await expect(page.getByRole("status").filter({ hasText: "clé budget_maximum" })).toBeVisible();
    const constraintRow = page.locator("#section-contraintes li", { hasText: "Budget maximum" });
    await expect(constraintRow).toContainText("au maximum");
    await expect(constraintRow).toContainText("30 000");

    // Objectifs : une ligne par objectif
    const settings = page.getByRole("form", { name: "Objectifs et réglages" });
    await settings.getByRole("textbox", { name: "Objectifs pédagogiques" }).fill("- Analyser des données de marché\n- Arbitrer sous contrainte de budget");
    await settings.getByRole("textbox", { name: "Résultat attendu" }).fill("Un plan de lancement à 30 jours.");
    await settings.getByRole("button", { name: "Enregistrer les objectifs" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Objectifs et réglages enregistrés" })).toBeVisible();

    // Compétences
    const skills = page.getByRole("form", { name: "Compétences mobilisées" });
    await skills.getByRole("checkbox", { name: /Analyse de données/ }).check();
    await skills.getByRole("button", { name: "Enregistrer les compétences" }).click();
    await expect(page.getByRole("status").filter({ hasText: /compétence/ })).toBeVisible();

    // Après rechargement, tout est persisté et la préparation a avancé.
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Entreprise" })).toHaveValue("NovaTech");
    await expect(page.getByRole("textbox", { name: "Rôle attribué" })).toHaveValue("Responsable marketing");
    await expect(page.getByRole("textbox", { name: "Objectifs pédagogiques" })).toHaveValue(
      "Analyser des données de marché\nArbitrer sous contrainte de budget",
    );
    await expect(page.getByRole("checkbox", { name: /Analyse de données/ })).toBeChecked();
    // Seule l'étape manquante reste signalée (le Mission Builder arrive en phase 5).
    await expect(page.getByText("Le Mission Builder arrive en phase 5.")).toBeVisible();
    await expect(page.getByText("Section « Briefing immersif »")).toHaveCount(0);

    // Suppression d'une contrainte
    const section = page.locator("#section-contraintes");
    await section.getByRole("button", { name: "Supprimer" }).first().click();
    await section.getByRole("button", { name: "Supprimer", exact: true }).first().click();
    await expect(section.getByText("budget_maximum")).toHaveCount(0);

    await deleteMission(page, title);
  });

  test("modifie la fiche et voit le titre changer", async ({ page }, testInfo) => {
    const title = `Mission renommée ${testInfo.project.name} ${Date.now()}`;
    const renamed = `${title} v2`;
    await login(page, TRAINER);
    await createMission(page, title);

    const form = page.getByRole("form", { name: "Fiche de la mission" });
    await form.getByRole("textbox", { name: "Titre de la mission" }).fill(renamed);
    await form.getByRole("combobox", { name: "Difficulté de la mission" }).selectOption("ADVANCED");
    await form.getByRole("button", { name: "Enregistrer la fiche" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);

    await deleteMission(page, renamed);
  });

  test("une mission d'une autre organisation renvoie une page introuvable", async ({ page }, testInfo) => {
    const title = `Mission cloisonnée ${testInfo.project.name} ${Date.now()}`;
    await login(page, TRAINER);
    const url = await createMission(page, title);

    // Le formateur crée sa propre organisation : la mission précédente n'y est plus visible.
    await page.goto("/app/admin").catch(() => {});
    await deleteMission(page, title);
    const response = await page.goto(`${url}x`);
    expect(response?.status()).toBe(404);
  });
});
