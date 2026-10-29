import { expect, test } from "@playwright/test";
import { ACCOUNTS, DEMO_PASSWORD, dismissCookies, expectAccessible } from "./helpers";

// Versions anglaise (/en) et espagnole (/es) ; le français reste sans préfixe.

const PAGES = ["", "/connexion", "/comptes", "/inscription/entreprise", "/inscription/commercial", "/aide", "/contact", "/cgv", "/cookies", "/plan-du-site"];

test.describe("versions anglaise et espagnole", () => {
  for (const lang of ["en", "es"] as const) {
    for (const path of PAGES) {
      test(`/${lang}${path} : langue, accessibilité`, async ({ page }) => {
        await dismissCookies(page);
        await page.goto(`/${lang}${path}`);
        await expect(page.locator("html")).toHaveAttribute("lang", lang);
        await expect(page.getByRole("link", { name: lang.toUpperCase(), exact: true })).toHaveAttribute("aria-current", "true");
        await expectAccessible(page);
      });
    }
  }

  test("le sélecteur change de langue et la mémorise", async ({ page }) => {
    await dismissCookies(page);
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nous contacter");
    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/contact$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contact us");
    // adresse sans préfixe : le choix mémorisé renvoie vers l'anglais
    await page.goto("/aide");
    await expect(page).toHaveURL(/\/en\/aide$/);
    await page.getByRole("link", { name: "ES", exact: true }).click();
    await expect(page).toHaveURL(/\/es\/aide$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Centro de ayuda");
    await page.getByRole("link", { name: "FR", exact: true }).click();
    await expect(page).toHaveURL(/\/aide$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("première visite : langue du navigateur", async ({ browser }) => {
    const ctx = await browser.newContext({ locale: "es-ES" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    await ctx.close();
  });

  test("connexion et espace entreprise en anglais, erreurs traduites", async ({ page }) => {
    await page.context().clearCookies();
    await dismissCookies(page);
    await page.goto("/en/connexion");
    await page.getByLabel("E-mail address").fill(ACCOUNTS.entreprise);
    await page.getByLabel("Password", { exact: true }).fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Incorrect e-mail or password.")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/en\/entreprise$/);
    await expect(page.getByText("Company dashboard").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your bookings" })).toBeVisible();
    await expectAccessible(page);
  });

  test("espace commercial en espagnol", async ({ page }) => {
    await page.context().clearCookies();
    await dismissCookies(page);
    await page.goto("/es/connexion");
    await page.getByLabel("Correo electrónico").fill(ACCOUNTS.commercial);
    await page.getByLabel("Contraseña", { exact: true }).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/es\/commercial$/);
    await expect(page.getByRole("heading", { name: "Mis misiones" })).toBeVisible();
    await expectAccessible(page);
  });

  test("l'administration reste en français", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/en/admin");
    // préfixe retiré, puis connexion (sans session) en français
    await expect(page).toHaveURL(/\/connexion\?next=%2Fadmin$/);
  });
});
