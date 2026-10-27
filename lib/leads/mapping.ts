/**
 * Correspondance entre les colonnes d'un fichier déposé par un commercial
 * et les colonnes du template de l'entreprise (ou de son CRM).
 */

export function normalizeHeader(h: string) {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Groupes de synonymes (en-têtes normalisés)
const GROUPS: Record<string, string[]> = {
  nom: ["nom", "name", "lastname", "nomdefamille", "surname", "familyname"],
  prenom: ["prenom", "firstname", "givenname", "prenoms"],
  societe: ["societe", "entreprise", "company", "companyname", "organisation", "organization", "raisonsociale", "structure"],
  fonction: ["fonction", "poste", "jobtitle", "titre", "title", "intitule", "role"],
  email: ["email", "mail", "courriel", "adresseemail", "adressemail", "emailaddress"],
  telephone: ["telephone", "tel", "phone", "phonenumber", "mobile", "portable", "numero", "gsm"],
  produit: ["produitdinteret", "produitsdinteret", "interet", "produit", "produits", "interest", "productofinterest"],
  note: ["note", "notes", "commentaire", "commentaires", "remarque", "remarques", "comment", "comments", "message"],
  date: ["datedecontact", "datducontact", "dateducontact", "datecontact", "date", "contactdate"],
  ville: ["ville", "city", "localite"],
  niveau: ["niveaudinteret", "niveau", "chaleur", "score", "leadstatus", "statut", "status"],
  consentement: ["consentement", "optin", "rgpd", "consent"],
};

const LOOKUP = new Map<string, string>();
for (const [group, aliases] of Object.entries(GROUPS)) for (const a of aliases) LOOKUP.set(a, group);

export function headerGroup(h: string) {
  const n = normalizeHeader(h);
  return LOOKUP.get(n) ?? n;
}

export type ColumnMapping = {
  /** colonne du template → en-tête du fichier (null si absente) */
  mapping: Record<string, string | null>;
  recognized: number;
  missing: string[];
};

export function mapColumns(templateColumns: string[], fileHeaders: string[]): ColumnMapping {
  const used = new Set<string>();
  const mapping: Record<string, string | null> = {};
  for (const col of templateColumns) {
    const exact = fileHeaders.find((h) => !used.has(h) && normalizeHeader(h) === normalizeHeader(col));
    const group = headerGroup(col);
    const match = exact ?? fileHeaders.find((h) => !used.has(h) && headerGroup(h) === group);
    mapping[col] = match ?? null;
    if (match) used.add(match);
  }
  const missing = templateColumns.filter((c) => mapping[c] === null);
  return { mapping, recognized: templateColumns.length - missing.length, missing };
}

/** Réordonne une ligne du fichier selon le template. Les colonnes de date manquantes sont complétées. */
export function remapRow(row: Record<string, string>, m: ColumnMapping, fallbackDate: string): { data: Record<string, string>; completed: boolean } {
  const data: Record<string, string> = {};
  let completed = false;
  for (const [col, src] of Object.entries(m.mapping)) {
    if (src) data[col] = row[src] ?? "";
    else if (headerGroup(col) === "date") {
      data[col] = fallbackDate;
      completed = true;
    } else data[col] = "";
  }
  return { data, completed };
}

export function isDateColumn(col: string) {
  return headerGroup(col) === "date";
}
