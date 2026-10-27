import ExcelJS from "exceljs";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";
import { HUBSPOT_FIELDS, STANDARD_LEAD_COLUMNS } from "@/lib/domain";
import { todayIso } from "@/lib/format";
import { createHubspotContacts, hubspotEnabled, refreshHubspotToken } from "@/lib/integrations/hubspot";
import { readBusinessCard, type CardData } from "@/lib/integrations/ocr";
import { headerGroup, mapColumns, remapRow, type ColumnMapping } from "@/lib/leads/mapping";
import { audit, notify } from "@/lib/notify";
import { putFile } from "@/lib/storage";
import { BookingError } from "./booking";

const MAX_ROWS = 5000;

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("hyperlink" in v) return String((v as { text?: string }).text ?? v.hyperlink);
  }
  return String(v).trim();
}

/** Lit la première feuille : première ligne non vide = en-têtes. */
export async function parseLeadWorkbook(data: Buffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(data as unknown as ArrayBuffer);
  } catch {
    throw new BookingError("Fichier illisible : déposez un fichier Excel (.xlsx).");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new BookingError("Le fichier ne contient aucune feuille.");
  let headerRow = 0;
  const headers: string[] = [];
  ws.eachRow((row, n) => {
    if (headerRow) return;
    const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellText);
    if (values.some(Boolean)) {
      headerRow = n;
      headers.push(...values.map((h, i) => h || `Colonne ${i + 1}`));
    }
  });
  if (!headerRow) throw new BookingError("Le fichier est vide.");
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, n) => {
    if (n <= headerRow || rows.length >= MAX_ROWS) return;
    const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellText);
    if (!values.some(Boolean)) return;
    rows.push(Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
  });
  return { headers, rows };
}

async function assignmentContext(db: Db, assignmentId: string, freelancerUserId: string | null) {
  const [row] = await db
    .select({ a: s.assignments, f: s.freelancers, b: s.bookings, c: s.companies })
    .from(s.assignments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .where(eq(s.assignments.id, assignmentId));
  if (!row || (freelancerUserId && row.f.userId !== freelancerUserId) || row.a.status !== "acceptee") {
    throw new BookingError("Mission introuvable.");
  }
  return row;
}

/** Colonnes attendues par l'entreprise pour une réservation. */
export async function templateColumns(db: Db, booking: typeof s.bookings.$inferSelect, company: typeof s.companies.$inferSelect) {
  if (company.leadMode === "crm") return { name: `${company.crmProvider ?? "CRM"} · champs importés`, columns: HUBSPOT_FIELDS.map((f) => f.label) };
  if (booking.leadTemplateId) {
    const [t] = await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.id, booking.leadTemplateId));
    if (t) return { name: t.name, columns: t.columns };
  }
  return { name: "Fiche standard Standby", columns: STANDARD_LEAD_COLUMNS };
}

export async function uploadLeadFile(db: Db, assignmentId: string, freelancerUserId: string, file: { data: Buffer; name: string }) {
  const ctx = await assignmentContext(db, assignmentId, freelancerUserId);
  const { headers, rows } = await parseLeadWorkbook(file.data);
  if (rows.length === 0) throw new BookingError("Aucune ligne de lead dans le fichier.");
  const tpl = await templateColumns(db, ctx.b, ctx.c);
  const mapping = mapColumns(tpl.columns, headers);
  if (mapping.recognized === 0) throw new BookingError("Aucune colonne ne correspond au format de l’entreprise. Vérifiez la première ligne du fichier.");

  // un seul fichier en brouillon par mission
  const drafts = await db
    .select({ id: s.leadBatches.id })
    .from(s.leadBatches)
    .where(and(eq(s.leadBatches.assignmentId, assignmentId), eq(s.leadBatches.source, "xlsx"), eq(s.leadBatches.status, "brouillon")));
  if (drafts.length) await db.delete(s.leadBatches).where(inArray(s.leadBatches.id, drafts.map((d) => d.id)));

  const key = `private/bookings/${ctx.b.id}/leads/${assignmentId}-${Date.now()}.xlsx`;
  await putFile(key, file.data, file.name);
  const [batch] = await db
    .insert(s.leadBatches)
    .values({
      assignmentId,
      bookingId: ctx.b.id,
      source: "xlsx",
      filename: file.name,
      mapping: { ...mapping, headers, fileKey: key },
      missing: mapping.missing,
      rowsCount: rows.length,
    })
    .returning();
  const fallbackDate = ctx.b.days.at(-1) ?? todayIso();
  const values = rows.map((r) => {
    const { data, completed } = remapRow(r, mapping, fallbackDate);
    return { batchId: batch.id, bookingId: ctx.b.id, data, completedByStandby: completed };
  });
  for (let i = 0; i < values.length; i += 500) await db.insert(s.leads).values(values.slice(i, i + 500));
  return { batch, mapping, headers, preview: rows.slice(0, 4) };
}

function cardToRow(columns: string[], card: CardData, date: string): Record<string, string> {
  const byGroup: Record<string, string> = {
    nom: card.nom,
    prenom: card.prenom,
    societe: card.societe,
    fonction: card.fonction,
    email: card.email,
    telephone: card.telephone,
    date,
    note: "Carte de visite",
  };
  return Object.fromEntries(columns.map((c) => [c, byGroup[headerGroup(c)] ?? ""]));
}

export async function uploadCards(db: Db, assignmentId: string, freelancerUserId: string, files: { data: Buffer; name: string }[]) {
  const ctx = await assignmentContext(db, assignmentId, freelancerUserId);
  if (files.length === 0) throw new BookingError("Ajoutez au moins une photo.");
  if (files.length > 50) throw new BookingError("50 photos maximum par envoi.");
  let [batch] = await db
    .select()
    .from(s.leadBatches)
    .where(and(eq(s.leadBatches.assignmentId, assignmentId), eq(s.leadBatches.source, "cartes"), eq(s.leadBatches.status, "brouillon")));
  batch ??= (await db.insert(s.leadBatches).values({ assignmentId, bookingId: ctx.b.id, source: "cartes" }).returning())[0];
  const tpl = await templateColumns(db, ctx.b, ctx.c);
  let read = 0;
  for (const [i, f] of files.entries()) {
    const key = `private/bookings/${ctx.b.id}/cartes/${batch.id}/${Date.now()}-${i}.${f.name.split(".").pop()}`;
    await putFile(key, f.data, f.name);
    const ocr = await readBusinessCard(f.data, f.name);
    let leadId: string | null = null;
    if (ocr) {
      const [lead] = await db
        .insert(s.leads)
        .values({ batchId: batch.id, bookingId: ctx.b.id, data: cardToRow(tpl.columns, ocr, todayIso()), completedByStandby: true })
        .returning();
      leadId = lead.id;
      read++;
    }
    await db.insert(s.businessCards).values({ batchId: batch.id, path: key, status: ocr ? "saisie" : "a_saisir", ocr: ocr ?? undefined, leadId });
  }
  const cards = await db.select().from(s.businessCards).where(eq(s.businessCards.batchId, batch.id));
  await db.update(s.leadBatches).set({ rowsCount: cards.length }).where(eq(s.leadBatches.id, batch.id));
  return { batchId: batch.id, uploaded: files.length, read };
}

/** « Envoyer à l'entreprise » : tous les brouillons de la mission. */
export async function sendBatches(db: Db, assignmentId: string, freelancerUserId: string) {
  const ctx = await assignmentContext(db, assignmentId, freelancerUserId);
  const drafts = await db
    .select()
    .from(s.leadBatches)
    .where(and(eq(s.leadBatches.assignmentId, assignmentId), eq(s.leadBatches.status, "brouillon")));
  if (drafts.length === 0) throw new BookingError("Déposez d’abord un fichier Excel ou des photos de cartes.");
  await db.update(s.leadBatches).set({ status: "envoye", sentAt: new Date() }).where(inArray(s.leadBatches.id, drafts.map((d) => d.id)));
  const total = drafts.reduce((n, d) => n + d.rowsCount, 0);
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, freelancerUserId));
  await notify(db, ctx.c.ownerId, {
    title: `${total} lead(s) reçus de ${p.firstName}`,
    body: `Réservation ${ctx.b.ref} : les leads sont disponibles dans votre espace, au format de votre template.`,
    link: `/entreprise/reservations/${ctx.b.id}`,
  });
  for (const d of drafts) await pushBatchToCrm(db, d.id);
  return total;
}

async function hubspotAccessToken(db: Db, companyId: string): Promise<string | null> {
  const [conn] = await db.select().from(s.crmConnections).where(eq(s.crmConnections.companyId, companyId));
  if (!conn || conn.status !== "connecte" || !conn.accessTokenEnc) return null;
  if (conn.expiresAt && conn.expiresAt.getTime() > Date.now() + 60_000) return decrypt(conn.accessTokenEnc);
  if (!conn.refreshTokenEnc) return null;
  const t = await refreshHubspotToken(decrypt(conn.refreshTokenEnc));
  await db
    .update(s.crmConnections)
    .set({ accessTokenEnc: encrypt(t.access_token), refreshTokenEnc: encrypt(t.refresh_token), expiresAt: new Date(Date.now() + t.expires_in * 1000) })
    .where(eq(s.crmConnections.id, conn.id));
  return t.access_token;
}

/** Pousse dans HubSpot les leads d'un lot envoyé (entreprises en mode CRM connecté). */
export async function pushBatchToCrm(db: Db, batchId: string) {
  const [row] = await db
    .select({ batch: s.leadBatches, company: s.companies })
    .from(s.leadBatches)
    .innerJoin(s.bookings, eq(s.bookings.id, s.leadBatches.bookingId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .where(eq(s.leadBatches.id, batchId));
  if (!row || row.batch.status === "brouillon" || row.company.leadMode !== "crm" || !hubspotEnabled()) return;
  try {
    const token = await hubspotAccessToken(db, row.company.id);
    if (!token) return;
    const rows = await db.select().from(s.leads).where(eq(s.leads.batchId, batchId));
    const contacts = rows.map((r) => {
      const data = r.data as Record<string, string>;
      return Object.fromEntries(HUBSPOT_FIELDS.filter((f) => data[f.label]).map((f) => [f.property, data[f.label]]));
    });
    await createHubspotContacts(token, contacts.filter((c) => Object.keys(c).length > 0));
    await db.update(s.leadBatches).set({ status: "pousse_crm", crmError: null }).where(eq(s.leadBatches.id, batchId));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.update(s.leadBatches).set({ crmError: message.slice(0, 500) }).where(eq(s.leadBatches.id, batchId));
    await audit(db, null, "crm.push_failed", "lead_batch", batchId, { message });
  }
}

/** Saisie manuelle d'une carte par l'équipe Standby. */
export async function transcribeCard(db: Db, cardId: string, adminId: string, card: Omit<CardData, "lisible">) {
  const [row] = await db
    .select({ card: s.businessCards, batch: s.leadBatches, b: s.bookings, c: s.companies })
    .from(s.businessCards)
    .innerJoin(s.leadBatches, eq(s.leadBatches.id, s.businessCards.batchId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.leadBatches.bookingId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .where(eq(s.businessCards.id, cardId));
  if (!row) throw new BookingError("Carte introuvable.");
  if (row.card.status === "saisie") throw new BookingError("Carte déjà saisie.");
  const tpl = await templateColumns(db, row.b, row.c);
  const [lead] = await db
    .insert(s.leads)
    .values({ batchId: row.batch.id, bookingId: row.b.id, data: cardToRow(tpl.columns, { ...card, lisible: true }, todayIso()), completedByStandby: true })
    .returning();
  await db.update(s.businessCards).set({ status: "saisie", leadId: lead.id }).where(eq(s.businessCards.id, cardId));
  await audit(db, adminId, "card.transcribe", "business_card", cardId);
  if (row.batch.status !== "brouillon" && row.c.leadMode === "crm") await pushBatchToCrm(db, row.batch.id);
}

export async function bookingLeads(db: Db, bookingId: string) {
  return db
    .select({ id: s.leads.id, data: s.leads.data, completed: s.leads.completedByStandby, createdAt: s.leads.createdAt, source: s.leadBatches.source })
    .from(s.leads)
    .innerJoin(s.leadBatches, eq(s.leadBatches.id, s.leads.batchId))
    .where(and(eq(s.leads.bookingId, bookingId), inArray(s.leadBatches.status, ["envoye", "pousse_crm"])))
    .orderBy(desc(s.leads.createdAt));
}

/** Export Excel dans l'ordre des colonnes de l'entreprise. */
export async function exportLeadsXlsx(db: Db, bookingId: string, companyId: string): Promise<{ data: Buffer; filename: string }> {
  const [b] = await db.select().from(s.bookings).where(and(eq(s.bookings.id, bookingId), eq(s.bookings.companyId, companyId)));
  if (!b) throw new BookingError("Réservation introuvable.");
  const [c] = await db.select().from(s.companies).where(eq(s.companies.id, companyId));
  const tpl = await templateColumns(db, b, c);
  const rows = await bookingLeads(db, bookingId);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Leads");
  ws.addRow(tpl.columns).font = { bold: true };
  for (const r of rows) {
    const data = r.data as Record<string, string>;
    ws.addRow(tpl.columns.map((col) => data[col] ?? ""));
  }
  ws.columns.forEach((col) => (col.width = 22));
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return { data: buf, filename: `leads-${b.ref}.xlsx` };
}

export type { ColumnMapping };
