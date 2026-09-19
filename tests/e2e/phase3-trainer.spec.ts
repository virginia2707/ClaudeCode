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

/** Données propres au projet Playwright : desktop et mobile partagent la même
 *  base, chaque projet ne modifie donc que son propre bac à sable. */
const sandboxTitle = (project: string) => `Bac à sable ${project}`;

/** Ligne de mission repérée par son titre exact : `hasText` attraperait aussi
 *  « … (copie) », dont le titre contient celui de l'original. */
const missionRow = (page: Page, title: string) =>
  page.locator("li").filter({ has: page.getByRole("link", { name: title, exact: true }) });

async function noSeriousA11y(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
}

test.describe("tableau de bord formateur", () => {
  test("affiche les compteurs réels et les missions récentes", async ({ page }) => {
    await login(page, TRAINER);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour Farid");
    await expect(page.locator(".card-inset", { hasText: "Missions" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Missions récentes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "48 heures pour lancer le produit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Compétences", exact: true })).toBeVisible();
    await noSeriousA11y(page);
  });

  test("la création de mission est annoncée comme indisponible", async ({ page }) => {
    await login(page, TRAINER);
    await expect(page.getByRole("button", { name: "Nouvelle mission" }).first()).toBeDisabled();
  });
});

test.describe("liste des missions", () => {
  test("liste, filtre par statut, recherche et trie", async ({ page }) => {
    await login(page, TRAINER);
    await page.goto("/app/trainer/missions");
    await expect(page.getByRole("link", { name: "48 heures pour lancer le produit" })).toBeVisible();

    // L'onglet « Toutes » exclut les missions archivées.
    await expect(page.getByText("Ancienne mission de recrutement")).toHaveCount(0);
    await page.getByRole("link", { name: /Archivée/ }).click();
    await expect(page).toHaveURL(/status=ARCHIVED/);
    await expect(page.getByText("Ancienne mission de recrutement")).toBeVisible();

    await page.getByRole("link", { name: /^Publiée/ }).click();
    await expect(page.getByText("48 heures pour lancer le produit")).toBeVisible();
    await expect(page.getByText("Gérer un conflit")).toHaveCount(0);

    // Recherche sur un champ autre que le titre (le secteur).
    await page.getByRole("link", { name: /^Toutes/ }).click();
    await page.getByRole("searchbox", { name: "Rechercher" }).fill("Management");
    await page.getByRole("searchbox", { name: "Rechercher" }).press("Enter");
    await expect(page).toHaveURL(/q=Management/);
    await expect(page.getByText("Gérer un conflit")).toBeVisible();
    await expect(page.getByText("48 heures pour lancer le produit")).toHaveCount(0);

    // Recherche sans résultat : message spécifique, pas l'état vide initial.
    await page.getByRole("searchbox", { name: "Rechercher" }).fill("zzzz-introuvable");
    await page.getByRole("searchbox", { name: "Rechercher" }).press("Enter");
    await expect(page.getByText("Aucune mission ne correspond à votre recherche.")).toBeVisible();
  });

  test("duplique une mission, qui devient un brouillon distinct", async ({ page }, testInfo) => {
    const title = sandboxTitle(testInfo.project.name);
    await login(page, TRAINER);
    await page.goto(`/app/trainer/missions?q=${encodeURIComponent(title)}`);
    await missionRow(page, title).getByRole("button", { name: "Dupliquer" }).click();

    // Rester sur la page : naviguer tout de suite annulerait l'action en cours.
    // La copie contient le titre recherché, elle apparaît donc dans cette liste.
    const copy = missionRow(page, `${title} (copie)`);
    await expect(copy).toBeVisible();
    await expect(copy.getByText("Brouillon")).toBeVisible();
    await expect(copy.getByText("copie", { exact: true })).toBeVisible();
    // La copie conserve le contenu : 3 étapes comme l'originale.
    await expect(copy).toContainText("3 étapes");

    // Nettoyage : la copie n'a jamais été jouée, elle peut être supprimée.
    await copy.getByRole("button", { name: "Supprimer" }).click();
    await copy.getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(missionRow(page, `${title} (copie)`)).toHaveCount(0);
  });

  test("archive puis restaure une mission", async ({ page }, testInfo) => {
    const title = sandboxTitle(testInfo.project.name);
    await login(page, TRAINER);
    await page.goto(`/app/trainer/missions?q=${encodeURIComponent(title)}`);
    await missionRow(page, title).getByRole("button", { name: "Archiver" }).click();
    // Archivée : elle sort de l'onglet « Toutes » sans quitter la page.
    await expect(missionRow(page, title)).toHaveCount(0);

    await page.goto(`/app/trainer/missions?status=ARCHIVED&q=${encodeURIComponent(title)}`);
    await expect(missionRow(page, title)).toBeVisible();
    await missionRow(page, title).getByRole("button", { name: "Restaurer" }).click();
    await expect(missionRow(page, title)).toHaveCount(0);

    await page.goto(`/app/trainer/missions?status=DRAFT&q=${encodeURIComponent(title)}`);
    await expect(missionRow(page, title)).toBeVisible();
  });
});

test.describe("compétences", () => {
  test("ajoute, modifie, importe et protège une compétence utilisée", async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    const created = `Négociation ${project}`;
    const renamed = `Négociation B2B ${project}`;
    const globalSkill = project === "desktop" ? "Esprit critique" : "Planification";
    await login(page, TRAINER);
    await page.goto("/app/trainer/skills");
    const ownList = page.getByRole("list", { name: "Référentiel de l'organisation" });
    const libraryList = page.getByRole("list", { name: "Bibliothèque MissionIA" });

    // La compétence « Segmentation client » est rattachée à une mission : non supprimable.
    const used = ownList.locator("li", { hasText: "Segmentation client" }).first();
    await used.getByRole("button", { name: "Supprimer" }).click();
    await used.getByRole("button", { name: "Supprimer", exact: true }).last().click();
    await expect(used.getByRole("status")).toContainText("est utilisée par");

    // Création
    const form = page.getByRole("form", { name: "Ajouter une compétence" });
    await form.getByRole("textbox", { name: "Nom" }).fill(created);
    await form.getByRole("textbox", { name: "Catégorie" }).fill("Commerce");
    await form.getByRole("button", { name: "Ajouter" }).click();
    await expect(ownList.locator("li", { hasText: created }).first()).toBeVisible();

    // Modification
    const createdRow = ownList.locator("li", { hasText: created }).first();
    await createdRow.getByRole("button", { name: "Modifier" }).click();
    const editForm = page.getByRole("form", { name: `Modifier ${created}` });
    await editForm.getByRole("textbox", { name: "Nom" }).fill(renamed);
    await editForm.getByRole("button", { name: "Enregistrer" }).click();
    await expect(ownList.locator("li", { hasText: renamed }).first()).toBeVisible();

    // Suppression d'une compétence inutilisée
    const renamedRow = ownList.locator("li", { hasText: renamed }).first();
    await renamedRow.getByRole("button", { name: "Supprimer" }).click();
    await renamedRow.getByRole("button", { name: "Supprimer", exact: true }).last().click();
    await expect(ownList.locator("li", { hasText: renamed })).toHaveCount(0);

    // Import depuis la bibliothèque globale, puis retrait : le test reste
    // rejouable sur une base déjà utilisée.
    const libraryRow = libraryList.locator("li", { hasText: globalSkill }).first();
    const importedRow = ownList.locator("li", { hasText: globalSkill }).first();
    if (await libraryRow.getByRole("button", { name: "Ajouter" }).isVisible()) {
      await libraryRow.getByRole("button", { name: "Ajouter" }).click();
    }
    await expect(importedRow).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: /Référentiel de NovaSkills/ })).toBeVisible();
    await expect(libraryList.locator("li", { hasText: globalSkill }).filter({ hasText: "ajoutée" })).toHaveCount(1);

    await importedRow.getByRole("button", { name: "Supprimer" }).click();
    await importedRow.getByRole("button", { name: "Supprimer", exact: true }).last().click();
    await expect(ownList.locator("li", { hasText: globalSkill })).toHaveCount(0);
    await expect(libraryRow.getByRole("button", { name: "Ajouter" })).toBeVisible();
  });

  test("la page compétences est accessible", async ({ page }) => {
    await login(page, TRAINER);
    await page.goto("/app/trainer/skills");
    await noSeriousA11y(page);
  });
});

test.describe("apprenants", () => {
  test("liste les apprenants et filtre par recherche", async ({ page }, testInfo) => {
    await login(page, TRAINER);
    await page.goto("/app/trainer/learners");
    await expect(page.getByText("Léa Apprenante")).toBeVisible();
    await page.getByRole("searchbox", { name: "Rechercher" }).fill(`membre-${testInfo.project.name}`);
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(page.getByText("Léa Apprenante")).toHaveCount(0);
    await expect(page.getByText(`membre-${testInfo.project.name}@missionia.dev`)).toBeVisible();
    await noSeriousA11y(page);
  });
});

test.describe("cloisonnement", () => {
  test("un apprenant n'accède ni aux missions, ni aux compétences, ni aux apprenants", async ({ page }) => {
    await login(page, LEARNER);
    for (const path of ["/app/trainer/missions", "/app/trainer/skills", "/app/trainer/learners"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/app\/learn$/);
    }
  });
});
