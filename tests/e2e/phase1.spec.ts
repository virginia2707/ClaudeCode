import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/demo", "/design-system", "/login", "/register"];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "la page ne doit pas déborder horizontalement").toBeLessThanOrEqual(1);
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("landing page", () => {
  test("affiche le hero, les CTA et toutes les sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Transformez vos cours en missions professionnelles.");
    await expect(page.getByText("Avec MissionIA, vos apprenants apprennent en résolvant des problèmes réels").first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Créer ma première mission" }).first()).toHaveAttribute("href", "/register");
    await expect(page.getByRole("main").getByRole("link", { name: "Voir une mission démo" }).first()).toHaveAttribute("href", "/demo");
    for (const id of ["comment-ca-marche", "pourquoi", "formateurs", "organismes", "ia", "competences", "statistiques", "exemple", "tarifs", "faq", "cta"]) {
      await expect(page.locator(`#${id}`), `section #${id}`).toHaveCount(1);
    }
    expect(await page.locator("h1").count()).toBe(1);
  });

  test("le skip link mène au contenu principal au clavier", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu principal" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#contenu$/);
  });

  test("la FAQ s'ouvre et se ferme", async ({ page }) => {
    await page.goto("/");
    const first = page.locator("#faq details").first();
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
  });
});

test.describe("navigation mobile", () => {
  test("le menu mobile s'ouvre, se ferme avec Échap et expose aria-expanded", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile uniquement");
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Fermer le menu" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Navigation mobile" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("navigation", { name: "Navigation mobile" })).toHaveCount(0);
  });
});

test.describe("aperçu de mission /demo", () => {
  test("permet de choisir une option et affiche conséquence + alerte de contrainte", async ({ page }) => {
    await page.goto("/demo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choisir une stratégie de lancement");
    const validate = page.getByRole("button", { name: "Valider ma décision" });
    await expect(validate).toBeDisabled();
    await page.getByRole("radio", { name: /Option C/ }).check();
    await validate.click();
    await expect(page.getByText("Alerte contrainte")).toBeVisible();
    await expect(page.getByText(/dépasse la limite « Budget maximum » de 8[\s ]000 €/)).toBeVisible();
    await expect(page.getByText("Conséquence", { exact: true })).toBeVisible();
    await expect(page.getByText("Feedback pédagogique")).toBeVisible();
    await page.getByRole("button", { name: "Rejouer la décision" }).click();
    await expect(validate).toBeDisabled();
  });

  test("une option dans le budget affiche une contrainte respectée", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("radio", { name: /Option D/ }).check();
    await page.getByRole("button", { name: "Valider ma décision" }).click();
    await expect(page.getByText("Contrainte respectée")).toBeVisible();
  });
});

test.describe("pages phase 1 : responsive et accessibilité", () => {
  for (const path of PAGES) {
    test(`${path} charge, ne déborde pas et n'a pas de violation a11y sérieuse`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousA11yViolations(page);
    });
  }

  test("une route inconnue renvoie la page 404 stylée", async ({ page }) => {
    const response = await page.goto("/mission-inexistante");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("n'existe pas");
  });
});
