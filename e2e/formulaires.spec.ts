import { expect, test } from "@playwright/test";
import { ACCOUNTS, dismissCookies, login } from "./helpers";

// Constats de la recette du 28 octobre 2026

test("une erreur serveur garde la saisie et reste visible", async ({ page }) => {
  await dismissCookies(page);
  await page.goto("/inscription/entreprise");
  await page.getByLabel("Prénom *").fill("Inès");
  await page.getByLabel("Nom *", { exact: true }).fill("Recette");
  await page.getByLabel("Adresse e-mail *").fill(`formulaire-${Date.now()}@e2e.test`);
  await page.getByLabel("Mot de passe (10 caractères minimum) *").fill("motdepasse-e2e");
  await page.getByLabel("Confirmation *").fill("motdepasse-e2e");
  await page.getByLabel(/J’accepte les/).check();
  await page.getByLabel("Raison sociale *").fill("Recette QA");
  await page.getByLabel("SIRET *").fill("12345678901234");
  await page.getByLabel("Adresse de facturation *").fill("12 rue de la Paix, 75002 Paris");
  await page.getByRole("button", { name: "Continuer →" }).click();

  const alert = page.locator("form p[role=alert]");
  await expect(alert).toHaveText("SIRET invalide : 14 chiffres, vérifiez la saisie.");
  await expect(alert).toBeInViewport();
  await expect(page.getByLabel("Prénom *")).toHaveValue("Inès");
  await expect(page.getByLabel("Raison sociale *")).toHaveValue("Recette QA");
  await expect(page.getByLabel("Mot de passe (10 caractères minimum) *")).toHaveValue("motdepasse-e2e");
});

test("contact sans case de consentement ; page de connexion inutile une fois connecté", async ({ page }) => {
  await dismissCookies(page);
  await page.goto("/contact");
  await page.getByLabel("Nom et prénom").fill("Testeur Recette");
  await page.getByLabel("Adresse e-mail professionnelle").fill("recette@e2e.test");
  await page.getByLabel("Message").fill("Message de recette : formulaire de contact.");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Envoyer le message" }).click();
  await expect(page.getByRole("status")).toContainText("Message envoyé");

  await login(page, ACCOUNTS.entreprise);
  await page.goto("/connexion");
  await expect(page).toHaveURL(/\/entreprise$/);
});

test("annuler une réservation demande une confirmation explicite, puis se déconnecter depuis l'en-tête", async ({ page }) => {
  await dismissCookies(page);
  await login(page, ACCOUNTS.entreprise);
  await page.goto("/entreprise");
  await page.getByRole("link", { name: "Salon des maires et des collectivités locales" }).click();
  const confirm = page.getByLabel(/annuler définitivement/);
  await expect(confirm).not.toBeChecked();
  await expect(confirm).toHaveAttribute("required", "");

  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Se déconnecter" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await page.goto("/entreprise");
  await expect(page).toHaveURL(/\/connexion/);
});
