import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, dismissCookies, expectAccessible, login } from "./helpers";

// Suivi de l'inscription : « compte en cours de traitement » affiché tant que l'équipe n'a pas statué, et e-mails
// correspondants (lisibles dans la boîte d'envoi simulée de l'admin, faute de Resend en test).

const SIRET = "73282932000074"; // clé de Luhn valide ; SIRENE est hors ligne en test (playwright.config.ts)
const pdf = (name: string) => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 e2e") });

async function createAccount(page: Page, path: string, email: string) {
  await page.goto(path);
  await page.getByLabel("Prénom *").fill("Nina");
  await page.getByLabel("Nom *", { exact: true }).fill("Suivi");
  await page.getByLabel("Adresse e-mail *").fill(email);
  await page.getByLabel("Mot de passe (10 caractères minimum) *").fill("motdepasse-e2e");
  await page.getByLabel("Confirmation *").fill("motdepasse-e2e");
  await page.getByLabel(/J’accepte les/).check();
}

const next = (page: Page) => page.getByRole("button", { name: "Continuer →" }).click();
/** E-mail simulé de /admin/emails, par objet et destinataire. */
const mail = (page: Page, subject: string, to: string) => page.locator("section", { hasText: subject }).filter({ hasText: to });

test("commercial : dossier envoyé, profil en cours de vérification, accusé de réception", async ({ page }) => {
  await dismissCookies(page);
  const email = `commercial-${Date.now()}@e2e.test`;
  await createAccount(page, "/inscription/commercial", email);
  await page.getByLabel("Ville *").fill("Lyon");
  await next(page);
  await page.waitForURL(/etape=2/);

  await page.locator("label.chip", { hasText: "Commercial·e de stand" }).click();
  await page.locator("label.chip", { hasText: "Retail" }).click();
  await page.locator("input[name=rate]").fill("30");
  await next(page);
  await page.waitForURL(/etape=3/);
  await next(page);
  await page.waitForURL(/etape=4/);

  await page.locator("input[name=siret]").fill(SIRET);
  for (const doc of ["identite", "urssaf", "rib"]) await page.locator(`#doc_${doc}`).setInputFiles(pdf(`${doc}.pdf`));
  await page.locator("input[name=urssafIssuedOn]").fill(new Date().toISOString().slice(0, 10));
  await page.locator("input[name=billingAddress]").fill("8 rue des Lilas, 69003 Lyon");
  await page.locator("input[name=acceptMandate]").check();
  await page.getByRole("button", { name: "Envoyer mon profil ✓" }).click();
  await page.waitForURL(/\/commercial\?bienvenue=1/);

  const review = page.locator(".note.review");
  await expect(review.getByText("Profil en cours de vérification")).toBeVisible();
  await expect(review.getByText("Reçu, en vérification")).toHaveCount(3);
  // pas le message « profil validé » tant que l'équipe n'a pas statué
  await expect(page.getByText("Profil envoyé et validé")).toHaveCount(0);
  // l'encadré reste aux visites suivantes, pas seulement après l'inscription
  await page.goto("/commercial");
  await expect(review).toBeVisible();
  await expectAccessible(page);

  await login(page, ACCOUNTS.admin);
  await page.goto("/admin/emails");
  await expect(mail(page, "Dossier reçu : votre profil est en cours de vérification", email)).toBeVisible();
});

test("entreprise : bienvenue, vérification du SIRET affichée jusqu'à la confirmation de l'équipe", async ({ page }) => {
  await dismissCookies(page);
  const email = `societe-${Date.now()}@e2e.test`;
  const name = `Suivi E2E ${Date.now()}`;
  await createAccount(page, "/inscription/entreprise", email);
  await page.getByLabel("Raison sociale *").fill(name);
  await page.getByLabel("SIRET *").fill(SIRET);
  await page.getByLabel("Adresse de facturation *").fill("12 rue de la Paix, 75002 Paris");
  await next(page);
  await page.waitForURL(/etape=2/);
  await next(page);
  await page.waitForURL(/etape=3/);
  await page.locator("input[name=ref_name]").first().fill("Claire Dubois");
  await next(page);
  await page.waitForURL(/etape=4/);
  await page.locator("input[name=mode][value=standard]").check({ force: true });
  await page.getByRole("button", { name: "Créer mon compte ✓" }).click();
  await page.waitForURL(/\/entreprise\?bienvenue=1/);

  const verifying = page.getByText("Vérification de votre entreprise en cours");
  await expect(verifying).toBeVisible();
  await page.goto("/entreprise");
  await expect(verifying).toBeVisible();

  await login(page, ACCOUNTS.admin);
  await page.goto("/admin/emails");
  await expect(mail(page, `Bienvenue sur Stand-By, ${name}`, email)).toContainText("vérifie l’identité de votre entreprise");
  // l'équipe confirme l'identité : l'exposant est prévenu et le rappel disparaît
  await page.goto("/admin/inscrits");
  await page.locator(".brow", { hasText: name }).getByRole("button", { name: "Confirmer l’identité" }).click();
  await expect(page.locator(".brow", { hasText: name }).getByText("vérifiée")).toBeVisible();
  await page.goto("/admin/emails");
  await expect(mail(page, "Votre entreprise est vérifiée", email)).toBeVisible();

  await login(page, email, "motdepasse-e2e");
  await page.goto("/entreprise");
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(verifying).toHaveCount(0);
});
