import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// Mot de passe des comptes de démonstration (base locale, voir db/seed.ts)
export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "standby-demo";

export const ACCOUNTS = {
  entreprise: "claire@maison-lumen.test",
  commercial: "karim.benali@standby.test",
  admin: "admin@standby.test",
};

export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.context().clearCookies();
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"));
}

/** Masque le bandeau cookies (choix « Tout refuser » mémorisé). */
export async function dismissCookies(page: Page) {
  await page.context().addCookies([
    { name: "standby_consent", value: encodeURIComponent(JSON.stringify({ audience: false, perso: false, pub: false })), url: "http://localhost:3100" },
  ]);
}

/** Aucune violation WCAG 2.1 A/AA d'impact sérieux ou critique. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = blocking.map((v) => `${v.id} (${v.impact}) : ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n  ")}`);
  expect(report, `Violations d'accessibilité sur ${page.url()}`).toEqual([]);
}
