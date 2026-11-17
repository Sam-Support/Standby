import ExcelJS from "exceljs";
import { SPECIALTIES } from "@/lib/domain";
import { AdminError } from "./admin";

/**
 * Modèle Excel du calendrier des salons et foires, et lecture d'un classeur rempli.
 *
 * Le classeur est converti en CSV (séparateur « ; ») puis passe par le même import que les fichiers CSV
 * (importEventsCsv, lib/services/admin.ts) : mêmes colonnes, mêmes contrôles, mêmes messages d'erreur.
 */

export const EVENTS_SHEET = "Salons et foires";
const HELP_SHEET = "Mode d’emploi";
const EXAMPLES_SHEET = "Exemples";
const LISTS_SHEET = "Listes";
const MAX_ROWS = 500;
const MAX_IMPORT_ROWS = 2000;

/** En-têtes de la première ligne : l'import les reconnaît sans tenir compte des majuscules ni des accents. */
const COLUMNS = [
  { header: "Nom", required: true, width: 38, format: "Texte", example: "Salon Exemple de l’industrie", help: "Nom du salon ou de la foire, tel qu’il s’affichera sur le site." },
  { header: "Type", required: true, width: 12, format: "salon ou foire", example: "salon", help: "« salon » pour un salon professionnel, « foire » pour une foire grand public. Liste déroulante." },
  { header: "Ville", required: true, width: 18, format: "Texte", example: "Paris", help: "Ville où se tient l’événement." },
  { header: "Début", required: true, width: 14, format: "Date AAAA-MM-JJ", example: "2027-03-23", help: "Premier jour d’ouverture. Une date Excel ou 2027-03-23 ou 23/03/2027." },
  { header: "Fin", required: true, width: 14, format: "Date AAAA-MM-JJ", example: "2027-03-25", help: "Dernier jour d’ouverture, le même jour que le début pour un événement d’une journée." },
  { header: "Montage", required: false, width: 14, format: "Date AAAA-MM-JJ", example: "2027-03-22", help: "Facultatif : jour de montage du stand, avant l’ouverture (en général la veille). Laisser vide sinon." },
  { header: "Secteur", required: true, width: 30, format: "Texte", example: "Industrie et fabrication", help: "Secteur affiché au public, avec vos mots." },
  { header: "Spécialité", required: false, width: 28, format: "Liste", example: "Industrie", help: "Facultatif mais utile : sert à proposer aux exposants les commerciaux de la même spécialité. Liste déroulante (onglet « Listes »)." },
  { header: "Site", required: false, width: 34, format: "Adresse web", example: "https://www.exemple.fr", help: "Facultatif : site officiel de l’organisateur (http ou https)." },
] as const;

const DATE_COLUMNS = ["Début", "Fin", "Montage"];
const EXAMPLES = [
  ["Salon Exemple de l’industrie", "salon", "Paris", "2027-03-23", "2027-03-25", "2027-03-22", "Industrie et fabrication", "Industrie", "https://www.exemple.fr"],
  ["Foire Exemple de printemps", "foire", "Lyon", "2027-04-02", "2027-04-11", "", "Maison et grand public", "Maison & grand public", ""],
  ["Salon Exemple d’une journée", "salon", "Cannes", "2027-06-09", "2027-06-09", "", "Immobilier commercial", "Immobilier & bâtiment", ""],
];

const colLetter = (i: number) => String.fromCharCode(65 + i);
const NAVY = "FF1B2150";
const BLUE = "FF4D58EE";
const SOFT = "FFE7E9FF";

/** Classeur à remplir : feuille de saisie (en-têtes seuls), mode d'emploi avec exemples, listes de valeurs. */
export async function buildEventsTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Stand-By";
  wb.title = "Modèle d’import des salons et foires";

  // 1. Saisie : une ligne d'en-têtes, rien d'autre, pour qu'aucun exemple ne soit importé par erreur
  const ws = wb.addWorksheet(EVENTS_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({
    header: c.header,
    width: c.width,
    style: DATE_COLUMNS.includes(c.header) ? { numFmt: "yyyy-mm-dd" } : {},
  }));
  const head = ws.getRow(1);
  head.height = 24;
  COLUMNS.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.font = { bold: true, color: { argb: c.required ? "FFFFFFFF" : NAVY }, size: 12 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.required ? BLUE : SOFT } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.note = { texts: [{ text: `${c.required ? "Obligatoire" : "Facultatif"} · ${c.format}\n${c.help}` }], margins: { insetmode: "auto" } };
  });

  const typeCol = COLUMNS.findIndex((c) => c.header === "Type");
  const specCol = COLUMNS.findIndex((c) => c.header === "Spécialité");
  for (let r = 2; r <= MAX_ROWS + 1; r++) {
    ws.getCell(`${colLetter(typeCol)}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"salon,foire"'],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Type",
      error: "Choisissez « salon » ou « foire ».",
    };
    ws.getCell(`${colLetter(specCol)}${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`'${LISTS_SHEET}'!$A$2:$A$${SPECIALTIES.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Spécialité inconnue",
      error: "Cette valeur n’est pas dans la liste : l’événement ne sera rattaché à aucune spécialité de commercial. Continuer ?",
    };
    for (const name of DATE_COLUMNS) {
      const i = COLUMNS.findIndex((c) => c.header === name);
      ws.getCell(`${colLetter(i)}${r}`).dataValidation = {
        type: "date",
        operator: "greaterThan",
        allowBlank: true,
        formulae: [new Date(Date.UTC(2020, 0, 1))],
        showErrorMessage: true,
        errorStyle: "stop",
        errorTitle: "Date",
        error: "Saisissez une date (par exemple 2027-03-23 ou 23/03/2027).",
      };
    }
  }

  // 2. Mode d'emploi
  const help = wb.addWorksheet(HELP_SHEET);
  help.columns = [{ width: 16 }, { width: 14 }, { width: 22 }, { width: 28 }, { width: 80 }];
  help.mergeCells("A1:E1");
  help.getCell("A1").value = "Modèle d’import des salons et foires";
  help.getCell("A1").font = { bold: true, size: 16, color: { argb: NAVY } };
  const rules = [
    `Remplissez l’onglet « ${EVENTS_SHEET} » : une ligne par salon ou foire, sous la ligne d’en-têtes, sans la modifier.`,
    "Enregistrez en .xlsx (ou en CSV), puis importez le fichier dans l’administration : Salons et foires → Import. Trois lignes d’exemple sont dans l’onglet « Exemples ».",
    "L’import crée les événements : il ne met pas à jour un salon déjà présent. Réimporter le même fichier crée des doublons ; pour corriger un salon existant, modifiez-le depuis la liste.",
    "Les événements importés sont publiés tout de suite sur le site, avec des dates « à vérifier » : contrôlez-les sur le site de l’organisateur, puis marquez-les comme vérifiées.",
    "Aucun logo n’est importé. Ajoutez-le ensuite depuis la fiche du salon, uniquement avec l’accord écrit de l’organisateur.",
    "Une ligne en erreur n’empêche pas les autres : l’import indique le numéro des lignes refusées et la raison.",
  ];
  rules.forEach((text, i) => {
    help.mergeCells(`A${3 + i}:E${3 + i}`);
    const cell = help.getCell(`A${3 + i}`);
    cell.value = `${i + 1}. ${text}`;
    cell.alignment = { wrapText: true, vertical: "top" };
    help.getRow(3 + i).height = text.length > 120 ? 34 : 20;
  });

  const tableTop = 3 + rules.length + 1;
  const tableHead = help.getRow(tableTop);
  ["Colonne", "Obligatoire", "Format", "Exemple", "Explication"].forEach((h, i) => {
    const c = tableHead.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  });
  COLUMNS.forEach((c, i) => {
    const row = help.getRow(tableTop + 1 + i);
    row.getCell(1).value = c.header;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = c.required ? "oui" : "non";
    row.getCell(3).value = c.format;
    row.getCell(4).value = c.example;
    row.getCell(5).value = c.help;
    row.getCell(5).alignment = { wrapText: true, vertical: "top" };
    row.height = c.help.length > 90 ? 32 : 18;
  });

  // 3. Exemples fictifs, sur leur propre feuille (jamais lue par l'import)
  const ex = wb.addWorksheet(EXAMPLES_SHEET);
  ex.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));
  ex.getRow(1).font = { bold: true, color: { argb: NAVY } };
  ex.getRow(1).eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SOFT } }));
  EXAMPLES.forEach((line, r) => line.forEach((v, i) => (ex.getRow(2 + r).getCell(i + 1).value = v)));
  ex.getCell(`A${EXAMPLES.length + 3}`).value = "Exemples fictifs : ne les copiez pas tels quels, ils n’existent pas.";
  ex.getCell(`A${EXAMPLES.length + 3}`).font = { italic: true, color: { argb: "FF6B6F8D" } };

  // 4. Listes de valeurs (alimentent les listes déroulantes de la feuille de saisie)
  const lists = wb.addWorksheet(LISTS_SHEET);
  lists.columns = [{ header: "Spécialités", width: 34 }, { header: "Types", width: 12 }];
  lists.getRow(1).font = { bold: true };
  SPECIALTIES.forEach((sp, i) => (lists.getCell(`A${i + 2}`).value = sp));
  lists.getCell("B2").value = "salon";
  lists.getCell("B3").value = "foire";

  wb.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: "visible" }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return cellText((v as { text: ExcelJS.CellValue }).text);
    if ("hyperlink" in v) return String(v.hyperlink);
    return "";
  }
  return String(v).trim();
}

/** « 23/03/2027 » → « 2027-03-23 » ; toute autre saisie est laissée telle quelle (l'import la contrôle). */
function isoDate(v: string) {
  const m = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : v;
}

/** « Début » → « debut » : même repérage des en-têtes que l'import (sans accents ni majuscules). */
const plain = (h: string) =>
  h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const DATE_HEADERS = ["debut", "date-debut", "start", "fin", "date-fin", "end", "montage", "setup"];

export class EventsWorkbookError extends AdminError {}

/** Convertit la feuille de saisie d'un classeur rempli en CSV « ; » pour importEventsCsv. */
export async function eventsWorkbookToCsv(data: Buffer): Promise<string> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data as unknown as ArrayBuffer);
  } catch {
    throw new EventsWorkbookError("Fichier Excel illisible : enregistrez-le au format .xlsx ou en CSV.");
  }
  const ws = wb.getWorksheet(EVENTS_SHEET) ?? wb.worksheets[0];
  if (!ws) throw new EventsWorkbookError("Le classeur ne contient aucune feuille.");
  if (ws.rowCount > MAX_IMPORT_ROWS + 1) throw new EventsWorkbookError(`Trop de lignes : ${MAX_IMPORT_ROWS} salons au plus par import.`);
  // une ligne de CSV par ligne du classeur, vides comprises : le numéro de ligne d'un message d'erreur est celui d'Excel
  const lines: string[] = [];
  let dateAt: number[] | null = null; // colonnes de dates, repérées dans la ligne d'en-têtes
  for (let r = 1; r <= ws.rowCount; r++) {
    const values = (ws.getRow(r).values as ExcelJS.CellValue[]).slice(1);
    const cells = Array.from({ length: Math.max(values.length, COLUMNS.length) }, (_, i) =>
      cellText(values[i]).replace(/[;\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim(),
    );
    if (!cells.some((c) => c)) {
      lines.push("");
      continue;
    }
    if (dateAt === null) {
      dateAt = cells.flatMap((h, i) => (DATE_HEADERS.includes(plain(h)) ? [i] : []));
    } else {
      // les dates saisies à la française sont converties ; les autres colonnes restent telles quelles
      for (const i of dateAt) cells[i] = isoDate(cells[i]);
    }
    lines.push(cells.join(";"));
  }
  return lines.join("\n");
}
