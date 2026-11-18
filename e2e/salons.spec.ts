import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";
import { ACCOUNTS, dismissCookies, expectAccessible, login } from "./helpers";

// Calendrier des salons et foires : modèle Excel à télécharger, import d'un classeur rempli.

test("le modèle Excel n'est pas public", async ({ request }) => {
  const res = await request.get("/admin/salons/modele", { maxRedirects: 0 });
  expect([301, 302, 303, 307, 308]).toContain(res.status());
  expect(res.headers()["location"]).toMatch(/\/connexion/);
});

test("l'administrateur télécharge le modèle Excel, le remplit et l'importe", async ({ page }) => {
  await dismissCookies(page);
  await login(page, ACCOUNTS.admin);
  await page.goto("/admin/salons");
  await expectAccessible(page);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Télécharger le modèle Excel" }).click()]);
  expect(download.suggestedFilename()).toBe("modele-salons-et-foires.xlsx");

  // le fichier téléchargé est le modèle : on le remplit comme le ferait un utilisateur, puis on le renvoie
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile((await download.path())!);
  const ws = wb.getWorksheet("Salons et foires")!;
  expect(ws.getCell("A1").value).toBe("Nom");
  const name = `Salon Import Excel ${Date.now()}`;
  [name, "salon", "Nantes", new Date(Date.UTC(2031, 2, 23)), "25/03/2031", "", "Secteur d'essai", "Industrie", ""].forEach((v, i) => (ws.getCell(2, i + 1).value = v));
  // une deuxième ligne refusée (fin avant début) : l'import le dit sans bloquer la première
  ["Salon Erreur Excel", "foire", "Brest", "2031-05-10", "2031-05-01", "", "Secteur d'essai", "", ""].forEach((v, i) => (ws.getCell(3, i + 1).value = v));
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());

  await page.getByLabel("Fichier Excel ou CSV").setInputFiles({ name: "salons.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer });
  await page.getByRole("button", { name: "Importer" }).click();
  await expect(page.locator("form p[role=alert]")).toContainText("1 salon(s) importé(s). Ligne 3 : Dates invalides");

  await page.goto("/admin/salons");
  const row = page.locator("tr", { hasText: name });
  await expect(row).toContainText("Nantes");
  await expect(row).toContainText("2031");
});
