import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { SPECIALTIES } from "@/lib/domain";
import { importEventsCsv } from "./admin";
import { buildEventsTemplate, EVENTS_SHEET, eventsWorkbookToCsv, EventsWorkbookError } from "./events-template";

// Modèle Excel des salons et foires : contenu du classeur, puis aller-retour « classeur rempli → import ».

let db: Db;
let adminId: string;

beforeAll(async () => {
  db = await createPgliteDb(null, true);
  const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
  adminId = admin.id;
}, 60_000);

/** Remplit une ligne de la feuille de saisie, comme le ferait un utilisateur dans Excel (la feuille a déjà ses 500 lignes contrôlées). */
function put(ws: ExcelJS.Worksheet, row: number, values: ExcelJS.CellValue[]) {
  values.forEach((v, i) => (ws.getCell(row, i + 1).value = v));
}

async function load(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}

describe("modèle Excel", () => {
  it("contient la feuille de saisie (en-têtes seuls), le mode d'emploi, les exemples et les listes", async () => {
    const wb = await load(await buildEventsTemplate());
    expect(wb.worksheets.map((w) => w.name)).toEqual([EVENTS_SHEET, "Mode d’emploi", "Exemples", "Listes"]);

    const ws = wb.getWorksheet(EVENTS_SHEET)!;
    const headers = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1);
    expect(headers).toEqual(["Nom", "Type", "Ville", "Début", "Fin", "Montage", "Secteur", "Spécialité", "Site"]);
    // aucune ligne d'exemple : un fichier renvoyé tel quel n'importe rien
    expect(ws.actualRowCount).toBe(1);
    expect(ws.getCell("A1").note).toBeTruthy();
    expect(wb.getWorksheet("Exemples")!.actualRowCount).toBeGreaterThanOrEqual(4);

    const lists = wb.getWorksheet("Listes")!;
    expect(lists.getColumn(1).values!.slice(2)).toEqual(SPECIALTIES);
  });

  it("limite le type et la spécialité par des listes déroulantes, les dates par un contrôle", async () => {
    const ws = (await load(await buildEventsTemplate())).getWorksheet(EVENTS_SHEET)!;
    expect(ws.getCell("B2").dataValidation).toMatchObject({ type: "list", formulae: ['"salon,foire"'], errorStyle: "stop" });
    expect(ws.getCell("H2").dataValidation).toMatchObject({ type: "list", errorStyle: "warning" });
    expect(ws.getCell("H2").dataValidation.formulae[0]).toBe(`'Listes'!$A$2:$A$${SPECIALTIES.length + 1}`);
    expect(ws.getCell("D2").dataValidation).toMatchObject({ type: "date" });
    expect(ws.getCell("F500").dataValidation).toMatchObject({ type: "date" });
  });
});

describe("classeur rempli → import", () => {
  it("importe des dates Excel, des dates à la française et du texte, et signale les lignes refusées", async () => {
    const wb = await load(await buildEventsTemplate());
    const ws = wb.getWorksheet(EVENTS_SHEET)!;
    // vraie date Excel
    put(ws, 2, ["Salon Test Excel", "salon", "Paris", new Date(Date.UTC(2027, 2, 23)), new Date(Date.UTC(2027, 2, 25)), new Date(Date.UTC(2027, 2, 22)), "Industrie ; fabrication", "Industrie", "https://www.exemple.fr"]);
    // dates saisies en texte, à la française puis en ISO
    put(ws, 3, ["Foire Test Excel", "foire", "Lyon", "02/04/2027", "11/04/2027", "", "Maison et grand public", "Maison & grand public", ""]);
    put(ws, 4, ["Salon Texte ISO", "salon", "Cannes", "2027-06-09", "2027-06-09", "", "Immobilier", "", ""]);
    // ligne vide au milieu, ligne en erreur (fin avant début)
    put(ws, 6, ["Salon Erreur", "salon", "Nice", "2027-05-10", "2027-05-01", "", "Tourisme", "", ""]);

    const csv = await eventsWorkbookToCsv(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(csv.split("\n")[0]).toBe("Nom;Type;Ville;Début;Fin;Montage;Secteur;Spécialité;Site");
    // le « ; » saisi dans une cellule ne décale pas les colonnes
    expect(csv).toContain("Salon Test Excel;salon;Paris;2027-03-23;2027-03-25;2027-03-22;Industrie fabrication;Industrie;https://www.exemple.fr");
    expect(csv).toContain("Foire Test Excel;foire;Lyon;2027-04-02;2027-04-11;");

    const res = await importEventsCsv(db, adminId, csv);
    expect(res.created).toBe(3);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/^Ligne 6 : Dates invalides/); // la ligne 5 est vide : le numéro est celui d'Excel

    const [excel] = await db.select().from(s.events).where(eq(s.events.name, "Salon Test Excel"));
    expect(excel).toMatchObject({ kind: "salon", city: "Paris", startsOn: "2027-03-23", endsOn: "2027-03-25", setupOn: "2027-03-22", specialty: "Industrie", published: true, logoAuthorized: false });
    const [foire] = await db.select().from(s.events).where(eq(s.events.name, "Foire Test Excel"));
    expect(foire).toMatchObject({ kind: "foire", city: "Lyon", startsOn: "2027-04-02", endsOn: "2027-04-11", setupOn: null });
  });

  it("refuse un fichier qui n'est pas un classeur, et un modèle laissé vide", async () => {
    await expect(eventsWorkbookToCsv(Buffer.from("ceci n'est pas un classeur"))).rejects.toBeInstanceOf(EventsWorkbookError);
    const csv = await eventsWorkbookToCsv(await buildEventsTemplate());
    await expect(importEventsCsv(db, adminId, csv)).rejects.toThrow(/au moins un salon/);
  });
});
