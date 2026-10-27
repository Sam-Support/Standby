import { test } from "@playwright/test";
import { ACCOUNTS, dismissCookies, expectAccessible, login } from "./helpers";

const PUBLIC = [
  "/",
  "/connexion",
  "/comptes",
  "/inscription/entreprise",
  "/inscription/commercial",
  "/mot-de-passe-oublie",
  "/aide",
  "/contact",
  "/cgv",
  "/cgu",
  "/mentions-legales",
  "/confidentialite",
  "/cookies",
  "/accessibilite",
  "/plan-du-site",
];

test.describe("accessibilité (axe, WCAG 2.1 AA)", () => {
  for (const path of PUBLIC) {
    test(`page publique ${path}`, async ({ page }) => {
      await dismissCookies(page);
      await page.goto(path);
      await expectAccessible(page);
    });
  }

  test("bandeau cookies", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "Choix des cookies" }).waitFor();
    await expectAccessible(page);
  });

  test("espace entreprise et parcours de réservation", async ({ page }) => {
    await dismissCookies(page);
    await login(page, ACCOUNTS.entreprise);
    for (const path of ["/entreprise", "/entreprise/profil", "/reserver", "/notifications", "/compte"]) {
      await page.goto(path);
      await expectAccessible(page);
    }
    // détail d'une réservation confirmée : barème et panneau d'annulation
    await page.goto("/entreprise");
    await page.getByRole("link", { name: "Supply Chain Event" }).click();
    await page.getByRole("heading", { name: "Annuler" }).waitFor();
    await expectAccessible(page);
    await page.goto("/reserver/nouveau?salon=equiphotel-2026");
    await page.waitForURL(/\/equipe$/);
    await expectAccessible(page);
    const base = page.url().replace(/\/equipe$/, "");
    await page.goto(`${base}/evenement`);
    await expectAccessible(page);
  });

  test("espace commercial", async ({ page }) => {
    await dismissCookies(page);
    await login(page, ACCOUNTS.commercial);
    for (const path of ["/commercial", "/commercial/profil"]) {
      await page.goto(path);
      await expectAccessible(page);
    }
  });

  test("administration", async ({ page }) => {
    await dismissCookies(page);
    await login(page, ACCOUNTS.admin);
    for (const path of ["/admin", "/admin/salons", "/admin/tarification", "/admin/inscrits?tous=1", "/admin/reservations", "/admin/finances", "/admin/avis"]) {
      await page.goto(path);
      await expectAccessible(page);
    }
  });
});
