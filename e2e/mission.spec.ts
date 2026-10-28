import { expect, test } from "@playwright/test";
import { ACCOUNTS, dismissCookies, expectAccessible, login } from "./helpers";

test.describe.serial("missions : désistement, heures contestées, avoir", () => {
  test("un commercial se désiste d'une mission acceptée", async ({ page }) => {
    await dismissCookies(page);
    await login(page, ACCOUNTS.commercial);
    await page.getByRole("link", { name: "Supply Chain Event" }).click();
    await page.getByRole("heading", { name: "Se désister" }).waitFor();
    await expectAccessible(page);
    await page.getByLabel("Motif (transmis uniquement à l’équipe Standby)").fill("Formation obligatoire ces deux jours-là.");
    await page.getByLabel("Je confirme me désister de cette mission.").check();
    await page.getByRole("button", { name: "Me désister" }).click();
    await expect(page.locator(".head").getByText("Désisté·e")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Se désister" })).toHaveCount(0);

    // l'exposant voit le désistement dans son équipe
    await login(page, ACCOUNTS.entreprise);
    await page.getByRole("link", { name: "Supply Chain Event" }).click();
    await expect(page.locator(".brow", { hasText: "Karim Benali" }).getByText("Désisté·e")).toBeVisible();
  });

  test("l'exposant réduit des heures, le commercial conteste, l'équipe arbitre puis émet un avoir", async ({ page }) => {
    await dismissCookies(page);
    const row = (name: string) => page.locator(".brow", { hasText: name });

    await login(page, ACCOUNTS.entreprise);
    await page.getByLabel("Heures de Karim").fill("14");
    await page.getByLabel("Motif si vous retenez moins d’heures pour Karim").fill("Arrivé à 11 h le deuxième jour");
    await row("Karim Benali").getByRole("button", { name: "Valider" }).click();
    await expect(row("Karim Benali").getByText("14 h retenues")).toBeVisible();
    for (const name of ["Sarah Benhamou", "Chloé Vidal"]) {
      await row(name).getByRole("button", { name: "Valider" }).click();
      await expect(row(name).getByText("validées")).toBeVisible();
    }

    await login(page, ACCOUNTS.commercial);
    await page.getByRole("link", { name: "Les Salons Solutions" }).click();
    await expect(page.locator("#adj-title")).toContainText("14 h");
    await expectAccessible(page);
    await page.getByLabel("Ce qui ne va pas").fill("Présent dès 9 h, badge scanné à l’entrée du hall.");
    await page.getByRole("button", { name: "Contester" }).click();
    await expect(page.getByText("Vous contestez l’ajustement")).toBeVisible();

    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/reservations?statut=heures_a_valider");
    await page.getByRole("link", { name: "SB-1004-2210" }).click();
    await expect(row("Karim Benali").getByText("heures contestées", { exact: true })).toBeVisible();
    await expectAccessible(page);
    await page.getByLabel("Heures retenues pour Karim").fill("15");
    await row("Karim Benali").getByRole("button", { name: "Arbitrer et valider" }).click();
    // toutes les heures sont validées : facture émise et réglée (paiement simulé)
    await expect(page.locator(".head").getByText("Payée")).toBeVisible();

    await page.getByLabel("Montant TTC (€)").fill("50");
    await page.getByLabel("Motif (figure sur l’avoir)").fill("Geste commercial");
    await page.getByRole("button", { name: "Émettre l’avoir" }).click();
    await expect(page.getByRole("status")).toContainText(/Avoir A-\d{4}-00001 émis et remboursé/);
    await page.getByRole("link", { name: /^Avoir A-/ }).click();
    await expect(page.getByRole("heading", { name: "Avoir" })).toBeVisible();
    await expect(page.getByText("Remboursé sur le moyen de paiement")).toBeVisible();
    await expectAccessible(page);
  });
});
