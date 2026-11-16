import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, dismissCookies, expectAccessible, login } from "./helpers";

// Page d'accueil : simulateur de coût, blocs de réassurance alignés, « Notre top commercial ».

const featuredBadge = "à l’honneur sur l’accueil";

/** Fiche d'un commercial dans /admin/inscrits (les autres panneaux de la page citent aussi des noms). */
const adminCard = (page: Page, name: string) => page.locator("section.panel").filter({ hasText: name }).filter({ hasText: "inscrit le" });

test.describe("page d'accueil", () => {
  test("le simulateur chiffre l'équipe et suit les réglages", async ({ page }) => {
    await dismissCookies(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Estimer mon budget" }).click();
    await expect(page).toHaveURL(/#simulateur$/);

    // par défaut : 2 commerciaux (27 €/h) + 1 accueil (19 €/h), 3 jours de 8 h facturées, 12 % de frais de service
    const total = page.getByTestId("sim-total");
    await expect(total).toHaveText(/^1\s962\s€$/);
    await expect(page.getByText("8 h facturées par jour et par personne, une heure de pause déduite.")).toBeVisible();

    await page.getByRole("button", { name: "Ajouter un·e Commercial·e de stand" }).click();
    await expect(total).toHaveText(/^2\s688\s€$/);
    await page.getByRole("button", { name: "Ajouter un jour" }).click();
    await expect(total).toHaveText(/^3\s584\s€$/); // 100 €/h × 8 h × 4 jours, + 12 %

    // horaires inversés : pas de prix, un message
    await page.getByLabel("Fermeture du stand").fill("08:00");
    await expect(total).toHaveText("—");
    await expect(page.getByText("L’heure de fermeture doit être après l’heure d’ouverture.").first()).toBeVisible();

    // demi-journée : pas de pause déduite
    await page.getByLabel("Fermeture du stand").fill("13:00");
    await expect(total).toHaveText(/^1\s792\s€$/); // 100 €/h × 4 h × 4 jours, + 12 %
    await expect(page.getByText("4 h facturées par jour et par personne.")).toBeVisible();

    await expect(page.locator("#simulateur").getByRole("link", { name: "Réserver cette équipe" })).toHaveAttribute("href", "/reserver/nouveau");
    await expectAccessible(page);
  });

  test("réassurance : boutons à la même hauteur, arguments chiffrés", async ({ page }) => {
    await dismissCookies(page);
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/");
    const blocks = page.locator(".audiences");
    const company = await blocks.getByRole("link", { name: "Créer mon compte entreprise" }).boundingBox();
    const freelancer = await blocks.getByRole("link", { name: "Créer mon compte commercial" }).boundingBox();
    expect(Math.abs(company!.y - freelancer!.y)).toBeLessThan(1);
    expect(Math.abs(company!.width - freelancer!.width)).toBeLessThan(1);
    expect(Math.abs(company!.height - freelancer!.height)).toBeLessThan(1);

    // chiffres tirés des réglages en vigueur (/admin/tarification)
    await expect(blocks.getByText("plus 12 % de frais de service")).toBeVisible();
    await expect(blocks.getByText("Annulation sans frais jusqu’à 14 jours avant le salon.")).toBeVisible();
    await expect(blocks.getByText("à partir de 27 €/h")).toBeVisible();
    await expect(blocks.getByText("Aucune commission : vous touchez 100 % de votre tarif.")).toBeVisible();
  });

  test("top commercial : un seul profil, choisi dans l'admin, sans nom complet", async ({ page }) => {
    await dismissCookies(page);
    await page.goto("/");
    const card = page.locator(".topcard");
    await expect(page.getByRole("heading", { name: "Notre top commercial" })).toBeVisible();
    await expect(card.getByRole("heading", { name: "Karim B." })).toBeVisible();
    await expect(card.getByText("salons avec Stand-By")).toBeVisible();
    expect(await page.content()).not.toContain("Benali");

    // l'admin choisit un autre profil : il remplace le précédent
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/inscrits?tous=1");
    await expect(adminCard(page, "Karim Benali").getByText(featuredBadge)).toBeVisible();
    await adminCard(page, "Sarah Benhamou").getByRole("button", { name: "Mettre à l’honneur" }).click();
    await expect(adminCard(page, "Sarah Benhamou").getByText(featuredBadge)).toBeVisible();
    await expect(page.getByText(featuredBadge)).toHaveCount(1);
    await page.goto("/");
    await expect(card.getByRole("heading", { name: "Sarah B." })).toBeVisible();

    // sans profil choisi, la section disparaît
    await page.goto("/admin/inscrits?tous=1");
    await adminCard(page, "Sarah Benhamou").getByRole("button", { name: "Retirer de l’accueil" }).click();
    await expect(page.getByText(featuredBadge)).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Trois étapes, zéro tableur" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notre top commercial" })).toHaveCount(0);

    // état de départ pour les autres tests
    await page.goto("/admin/inscrits?tous=1");
    await adminCard(page, "Karim Benali").getByRole("button", { name: "Mettre à l’honneur" }).click();
    await expect(adminCard(page, "Karim Benali").getByText(featuredBadge)).toBeVisible();
  });
});
