import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { listDays } from "@/lib/format";
import { runPayouts } from "./billing";
import {
  advanceBookings,
  autoSelect,
  confirmationIssues,
  confirmBooking,
  createDraft,
  getCompanyBooking,
  loadAssignments,
  loadBookingContext,
  respondToMission,
  saveBriefStep,
  saveEventStep,
  saveTeamStep,
  toggleSelection,
} from "./booking";
import { declareHours, validateAssignmentHours } from "./hours";
import { exportLeadsXlsx, parseLeadWorkbook, sendBatches, uploadLeadFile } from "./leads";

let db: Db;
let companyId: string;
let ownerId: string;

beforeAll(async () => {
  db = await createPgliteDb(null, true);
  const [c] = await db.select().from(s.companies).where(eq(s.companies.name, "Maison Lumen"));
  companyId = c.id;
  ownerId = c.ownerId;
});

async function bookEquipHotel() {
  const [event] = await db.select().from(s.events).where(eq(s.events.slug, "equiphotel-2026"));
  const draft = await createDraft(db, companyId, event.slug);
  expect(draft.days).toEqual(listDays("2026-11-02", "2026-11-05"));
  const reload = async () => (await getCompanyBooking(db, draft.id, companyId))!;
  await saveEventStep(db, await reload(), { eventId: event.id, days: [...draft.days, "2026-11-01"], startTime: "09:00", endTime: "18:00", stand: "B41" });
  await saveTeamStep(db, await reload(), { positions: { commercial: 2, accueil: 1 }, languages: ["Français", "Anglais"], outfit: "exposant" });
  const [ref] = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, companyId));
  await saveBriefStep(db, await reload(), {
    referentId: ref.id,
    highlights: "Nouvelle gamme LED",
    brief: "Accueil et qualification",
    leadTemplateId: null,
    leadFrequency: "quotidien",
  });
  await autoSelect(db, await reload());
  return reload;
}

describe("parcours de réservation complet", () => {
  it("réserve, confirme, fait accepter, valide les heures, facture et paie", async () => {
    const reload = await bookEquipHotel();
    let b = await reload();
    expect(b.days).toHaveLength(5); // montage compris

    const ctx = await loadBookingContext(db, b);
    expect(ctx.assignments).toHaveLength(3);
    expect(ctx.estimated).toBe(false);
    expect(ctx.quote.people).toBe(3);
    expect(await confirmationIssues(db, b)).toEqual([]);

    await confirmBooking(db, b, ownerId);
    b = await reload();
    expect(b.status).toBe("envoyee");
    expect(b.totalHtCents).toBe(ctx.quote.totalHtCents);

    const asg = await loadAssignments(db, b.id);
    expect(asg.every((a) => a.status === "proposee")).toBe(true);
    await respondToMission(db, asg[0].id, asg[0].userId, true);
    expect((await reload()).status).toBe("partielle");
    for (const a of asg.slice(1)) await respondToMission(db, a.id, a.userId, true);
    expect((await reload()).status).toBe("confirmee");

    await advanceBookings(db, "2026-11-01");
    expect((await reload()).status).toBe("en_cours");
    await advanceBookings(db, "2026-11-06");
    expect((await reload()).status).toBe("heures_a_valider");

    for (const a of asg) {
      await declareHours(db, a.id, a.userId, b.days.map((day) => ({ day, minutes: 480 })), "2026-11-06");
    }
    await validateAssignmentHours(db, asg[0].id, companyId, ownerId, 5 * 480 - 60); // ajusté d'une heure
    await validateAssignmentHours(db, asg[1].id, companyId, ownerId);
    expect((await reload()).status).toBe("heures_a_valider");
    await validateAssignmentHours(db, asg[2].id, companyId, ownerId);

    b = await reload();
    expect(b.status).toBe("payee"); // paiement simulé sans Stripe
    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id));
    expect(invoice.number).toMatch(/^F-\d{4}-\d{5}$/);
    expect(invoice.totalTtcCents).toBe(invoice.totalHtCents + invoice.vatCents);
    const payouts = await db.select().from(s.payouts);
    const mine = payouts.filter((p) => asg.some((a) => a.id === p.assignmentId));
    expect(mine).toHaveLength(3);
    const first = mine.find((p) => p.assignmentId === asg[0].id)!;
    expect(first.amountCents).toBe(Math.round((asg[0].hourlyRateCents * (5 * 480 - 60)) / 60));
    expect(await runPayouts(db, first.scheduledFor)).toBeGreaterThanOrEqual(3);
  });

  it("propose un remplaçant quand un commercial refuse", async () => {
    const reload = await bookEquipHotel();
    await confirmBooking(db, await reload(), ownerId);
    const asg = await loadAssignments(db, (await reload()).id);
    await respondToMission(db, asg[0].id, asg[0].userId, false);
    const after = await loadAssignments(db, asg[0].id ? (await reload()).id : "");
    expect(after.find((a) => a.id === asg[0].id)?.status).toBe("refusee");
    expect(after.filter((a) => a.status === "proposee")).toHaveLength(3);
  });

  it("empêche de dépasser le nombre de places d'un poste", async () => {
    const reload = await bookEquipHotel();
    const b = await reload();
    const [other] = await db.select().from(s.freelancers).where(eq(s.freelancers.status, "valide"));
    await expect(toggleSelection(db, b, other.id, "accueil")).rejects.toThrow();
  });
});

describe("leads", () => {
  it("mappe un fichier Excel sur le template de l'entreprise et l'exporte", async () => {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.ref, "SB-1004-2210"));
    const [a] = await loadAssignments(db, b.id);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Leads");
    ws.addRow(["Nom", "Prénom", "Entreprise", "Poste", "E-mail", "Tél", "Intérêt", "Commentaire"]);
    ws.addRow(["MARTIN", "Manon", "Verdi Agro", "Responsable achats", "m.martin@verdiagro.example", "06 86 70 25 57", "LED", "Rappeler"]);
    ws.addRow(["BERNARD", "Hugo", "Nordis Industrie", "Gérant", "h.bernard@nordis.example", "06 89 77 37 27", "", ""]);
    const data = Buffer.from(await wb.xlsx.writeBuffer());

    const res = await uploadLeadFile(db, a.id, a.userId, { data, name: "leads.xlsx" });
    expect(res.mapping.recognized).toBe(8);
    expect(res.mapping.missing).toEqual(["Date du contact"]);
    expect(await sendBatches(db, a.id, a.userId)).toBe(2);

    const out = await exportLeadsXlsx(db, b.id, companyId);
    const parsed = await parseLeadWorkbook(out.data);
    expect(parsed.headers).toEqual(["Nom", "Prénom", "Société", "Fonction", "Email", "Téléphone", "Produit d’intérêt", "Note", "Date du contact"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows.find((r) => r.Nom === "MARTIN")?.["Société"]).toBe("Verdi Agro");
    expect(parsed.rows[0]["Date du contact"]).toBe("2026-10-15");
  });
});
