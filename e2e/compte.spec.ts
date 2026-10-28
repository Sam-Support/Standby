import { expect, test } from "@playwright/test";
import { ACCOUNTS, dismissCookies, login } from "./helpers";

test("un utilisateur change son mot de passe puis son adresse e-mail", async ({ page }) => {
  await dismissCookies(page);
  const stamp = Date.now();
  const email = `compte-${stamp}@e2e.test`;
  const nouvelle = `compte-${stamp}-bis@e2e.test`;

  // compte créé à la 1re étape de l'inscription
  await page.goto("/inscription/commercial");
  await page.getByLabel("Prénom *").fill("Nina");
  await page.getByLabel("Nom *", { exact: true }).fill("Roux");
  await page.getByLabel("Adresse e-mail *").fill(email);
  await page.getByLabel("Mot de passe (10 caractères minimum) *").fill("motdepasse-e2e");
  await page.getByLabel("Confirmation *").fill("motdepasse-e2e");
  await page.getByLabel(/J’accepte les/).check();
  await page.getByLabel("Ville *").fill("Lyon");
  await page.getByRole("button", { name: "Continuer →" }).click();
  await page.waitForURL(/etape=2/);

  await page.goto("/compte");
  const passwordForm = page.locator("form", { has: page.getByLabel("Mot de passe actuel") });
  const fillPassword = async (current: string) => {
    await page.getByLabel("Mot de passe actuel").fill(current);
    await page.getByLabel("Nouveau mot de passe (10 caractères minimum)").fill("nouveau-mdp-e2e");
    await page.getByLabel("Confirmation du nouveau mot de passe").fill("nouveau-mdp-e2e");
    await page.getByRole("button", { name: "Changer le mot de passe" }).click();
  };
  await fillPassword("mauvais-mdp-00");
  await expect(passwordForm.getByRole("alert")).toHaveText("Mot de passe actuel incorrect.");
  await fillPassword("motdepasse-e2e");
  await expect(passwordForm.getByRole("status")).toContainText("Mot de passe modifié");
  // cet appareil reste connecté
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mon compte et mes données" })).toBeVisible();

  await page.getByLabel("Nouvelle adresse e-mail").fill(nouvelle);
  await page.getByLabel("Mot de passe (pour confirmer)").fill("nouveau-mdp-e2e");
  await page.getByRole("button", { name: "Recevoir le lien de confirmation" }).click();
  await expect(page.getByRole("status")).toContainText(`Lien de confirmation envoyé à ${nouvelle}`);

  // sans Resend, le lien est lisible dans la boîte d'envoi simulée
  await login(page, ACCOUNTS.admin);
  await page.goto("/admin/emails");
  const mail = page.locator("section", { hasText: "Confirmez votre nouvelle adresse" }).filter({ hasText: nouvelle });
  const link = await mail.getByRole("link").first().getAttribute("href");
  expect(link).toMatch(/\/nouvelle-adresse\//);
  await page.goto(new URL(link!).pathname);
  await expect(page).toHaveURL(/\/connexion\?email=modifie/);

  await login(page, nouvelle, "nouveau-mdp-e2e");
  await page.goto("/compte");
  await expect(page.locator("dd", { hasText: nouvelle })).toBeVisible();
});
