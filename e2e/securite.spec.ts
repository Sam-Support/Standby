import { expect, test } from "@playwright/test";
import { ACCOUNTS, dismissCookies, login } from "./helpers";

test.describe("sécurité", () => {
  test("CSP avec nonce, sans script bloqué", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
    });
    const res = await page.goto("/");
    const csp = res!.headers()["content-security-policy"];
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res!.headers()["x-content-type-options"]).toBe("nosniff");
    // l'application est interactive (hydratation autorisée par le nonce)
    await page.getByRole("button", { name: /^MAPIC,/ }).click();
    await expect(page.locator('[aria-roledescription="carrousel"] h3')).toHaveText("MAPIC");
    expect(violations).toEqual([]);
  });

  test("les espaces privés renvoient vers la connexion", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/entreprise");
    await expect(page).toHaveURL(/\/connexion\?next=%2Fentreprise/);
  });

  test("trop d'échecs de connexion bloquent le compte visé", async ({ page }) => {
    await dismissCookies(page);
    await page.goto("/connexion");
    const email = "personne@e2e.test";
    for (let i = 0; i < 8; i++) {
      await page.getByLabel("Adresse e-mail").fill(email);
      await page.getByLabel("Mot de passe", { exact: true }).fill(`mauvais-${i}`);
      await page.getByRole("button", { name: "Se connecter" }).click();
      await expect(page.locator("form p[role=alert]")).toHaveText("E-mail ou mot de passe incorrect.");
    }
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill("encore-faux");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.locator("form p[role=alert]")).toContainText("Trop de tentatives");
  });

  test("inscription : l'adresse e-mail doit être confirmée", async ({ page }) => {
    await dismissCookies(page);
    const email = `nouveau-${Date.now()}@e2e.test`;
    await page.goto("/inscription/commercial");
    await page.getByLabel("Prénom *").fill("Inès");
    await page.getByLabel("Nom *", { exact: true }).fill("Testeuse");
    await page.getByLabel("Adresse e-mail *").fill(email);
    await page.getByLabel("Mot de passe (10 caractères minimum) *").fill("motdepasse-e2e");
    await page.getByLabel("Confirmation *").fill("motdepasse-e2e");
    await page.getByLabel(/J’accepte les/).check();
    await page.getByLabel("Ville *").fill("Lyon");
    await page.getByRole("button", { name: "Continuer →" }).click();
    await page.waitForURL(/etape=2/);
    await expect(page.getByText(`un lien a été envoyé à ${email}`)).toBeVisible();

    // sans Resend, le lien est lisible dans la boîte d'envoi simulée de l'admin
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/emails");
    const link = await page.locator("section", { hasText: email }).getByRole("link").first().getAttribute("href");
    expect(link).toMatch(/\/verifier-email\//);

    await login(page, email, "motdepasse-e2e");
    await expect(page.getByText("Confirmez votre adresse e-mail")).toBeVisible();
    await page.goto(new URL(link!).pathname);
    // l'inscription n'étant pas terminée, l'espace commercial renvoie vers l'étape en cours
    await expect(page).toHaveURL(/\/inscription\/commercial/);
    await expect(page.getByText("Confirmez votre adresse e-mail")).toHaveCount(0);
  });
});
