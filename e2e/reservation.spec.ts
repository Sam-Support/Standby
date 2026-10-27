import { expect, test } from "@playwright/test";
import { ACCOUNTS, dismissCookies, login } from "./helpers";

test("une entreprise réserve une équipe de bout en bout", async ({ page }) => {
  await dismissCookies(page);
  await login(page, ACCOUNTS.entreprise);

  await page.goto("/reserver/nouveau?salon=equiphotel-2026");
  await page.waitForURL(/\/equipe$/);
  await page.getByRole("button", { name: "Appliquer" }).click();
  const aside = page.getByRole("complementary", { name: "Votre réservation" });
  await expect(aside).toContainText("3 personnes sur le stand");
  await page.getByRole("button", { name: "Préparer le brief" }).click();

  await page.waitForURL(/\/brief$/);
  await page.getByRole("button", { name: "Lancer le matching" }).click();

  await page.waitForURL(/\/profils$/);
  await expect(page.getByText("2 / 2 sélectionnés")).toBeVisible();
  await expect(page.getByText("1 / 1 sélectionné")).toBeVisible();
  await page.getByRole("link", { name: "Voir le récapitulatif" }).click();

  await page.waitForURL(/\/recap$/);
  await expect(page.getByText("Total TTC").first()).toBeVisible();
  await page.getByLabel(/J’accepte les conditions de prestation/).check();
  await page.getByRole("button", { name: "Confirmer la réservation" }).click();

  await page.waitForURL(/\/confirmation/);
  await expect(page.getByRole("heading", { name: "Réservation envoyée" })).toBeVisible();
  await expect(page.getByText("Acceptations 0 / 3")).toBeVisible();
});
