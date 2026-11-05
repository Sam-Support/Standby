import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, dismissCookies, expectAccessible, login } from "./helpers";

// Téléphone (375 px) : accueil sans carrousel, en-tête compact, aucune page plus large que l'écran.

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

async function noHorizontalScroll(page: Page) {
  const { scroll, width, culprits } = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("main *")].filter((e) => e.getBoundingClientRect().right > w + 0.5 && !e.closest(".tblwrap"));
    return {
      scroll: document.documentElement.scrollWidth,
      width: w,
      culprits: wide.slice(-4).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} (${Math.round(e.getBoundingClientRect().right)} px)`),
    };
  });
  expect(scroll, `largeur de ${page.url()} : ${culprits.join(", ")}`).toBeLessThanOrEqual(width);
}

test.describe("téléphone", () => {
  test("accueil : pas de carrousel, sections et agenda visibles", async ({ page }) => {
    await dismissCookies(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".hero-side")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Trois étapes, zéro tableur" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prochains salons à staffer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Staffer ce salon" }).first()).toBeVisible();
    await noHorizontalScroll(page);
    await expectAccessible(page);
  });

  test("le bureau garde le carrousel", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: "fr-FR" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator(".hero-side")).toBeVisible();
    await ctx.close();
  });

  test("menu de langue compact", async ({ page }) => {
    await dismissCookies(page);
    await page.goto("/contact");
    await page.locator(".langs-mini summary").click();
    await page.locator(".langs-menu").getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/contact$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact us");
  });

  test("espace entreprise : initiales dans l'en-tête, onglet actif visible, indicateurs sur une ligne", async ({ page }) => {
    await dismissCookies(page);
    await login(page, ACCOUNTS.entreprise);
    await page.goto("/entreprise");
    await expect(page.getByRole("link", { name: "Maison Lumen" }).first()).toBeVisible();
    await expect(page.locator(".acct .short")).toHaveText("ML");
    await expect(page.getByRole("link", { name: "Entreprise", exact: true })).toBeInViewport();
    const kpis = await page.locator(".kpi").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(kpis).size).toBe(1);
    await noHorizontalScroll(page);
    await expectAccessible(page);
  });

  test("parcours de réservation et espace commercial sans débordement", async ({ page }) => {
    await dismissCookies(page);
    await login(page, ACCOUNTS.entreprise);
    // « Nouvelle réservation » reprend le brouillon en cours, à l'étape où il en est : on contrôle les deux premières
    await page.goto("/reserver/nouveau");
    const draft = page.url().replace(/\/[a-z]+$/, "");
    await page.goto(`${draft}/evenement`);
    await expect(page.getByRole("heading", { name: "Quel événement ?" })).toBeVisible();
    await page.locator("label:has(input[name=eventId])").first().click();
    await expect(page.getByRole("heading", { name: "Quels jours ?" })).toBeVisible();
    await noHorizontalScroll(page);
    await page.getByRole("button", { name: "Composer l’équipe" }).click();
    await expect(page.getByRole("heading", { name: "Qui voulez-vous sur le stand ?" })).toBeVisible();
    await noHorizontalScroll(page);
    await expectAccessible(page);
    await login(page, ACCOUNTS.commercial);
    await page.goto("/commercial");
    await expect(page.getByRole("link", { name: "Commercial", exact: true })).toBeInViewport();
    await noHorizontalScroll(page);
    await expectAccessible(page);
  });
});
