import { eq, inArray } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { BILLING_MANDATE_VERSION } from "@/lib/domain";
import { payoutBreakdown } from "@/lib/pricing";
import { freelancerBilling } from "./accounts";
import {
  autoSelect,
  confirmBooking,
  createDraft,
  findCandidates,
  getCompanyBooking,
  loadAssignments,
  respondToMission,
  saveBriefStep,
  saveEventStep,
  saveTeamStep,
} from "./booking";
import { cancelBooking } from "./cancellation";
import { validateAssignmentHours } from "./hours";
import { nextSelfBillNumber, selfBillsFor, toCsv, totals, yearSummary, type Supplier } from "./self-billing";

let db: Db;
let companyId: string;
let ownerId: string;
let adminId: string;

beforeAll(async () => {
  db = await createPgliteDb(null, true);
  const [c] = await db.select().from(s.companies).where(eq(s.companies.name, "Maison Lumen"));
  companyId = c.id;
  ownerId = c.ownerId;
  const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
  adminId = admin.id;
});

const freelancer = async (id: string) => (await db.select().from(s.freelancers).where(eq(s.freelancers.id, id)))[0];
const invoicesOf = (payoutIds: string[]) => db.select().from(s.freelancerInvoices).where(inArray(s.freelancerInvoices.payoutId, payoutIds));

describe("calcul de la paie", () => {
  it("ajoute la TVA d'un commercial assujetti et retient la commission sur le HT", () => {
    expect(payoutBreakdown(10000, 0, 0)).toEqual({ htCents: 10000, vatCents: 0, ttcCents: 10000, commissionCents: 0, netCents: 10000 });
    expect(payoutBreakdown(10000, 500, 2000)).toEqual({ htCents: 10000, vatCents: 2000, ttcCents: 12000, commissionCents: 500, netCents: 11500 });
  });

  it("produit un CSV lisible par Excel", () => {
    expect(toCsv([["a;b", 'dit "oui"', null, 3]])).toBe('﻿"a;b";"dit ""oui""";;3\r\n');
  });
});

describe("mandat de facturation", () => {
  it("exige adresse, numéro de TVA si assujetti et acceptation du mandat", async () => {
    const [karim] = await db.select().from(s.freelancers).innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId)).where(eq(s.profiles.firstName, "Karim"));
    const f = { ...karim.freelancers, billingMandateAcceptedAt: null };
    const ok = { billingAddress: "8 rue des Lilas, 75011 Paris", vatRegime: "franchise", vatNumber: "", acceptMandate: true };
    await expect(freelancerBilling(db, f, { ...ok, billingAddress: "Paris" })).rejects.toThrow(/adresse/);
    await expect(freelancerBilling(db, f, { ...ok, vatRegime: "assujetti", vatNumber: "123" })).rejects.toThrow(/TVA/);
    await expect(freelancerBilling(db, f, { ...ok, acceptMandate: false })).rejects.toThrow(/mandat/);
  });

  it("retire du matching un commercial sans mandat", async () => {
    const draft = await createDraft(db, companyId, "equiphotel-2026");
    const b = (await getCompanyBooking(db, draft.id, companyId))!;
    const [first] = await findCandidates(db, b, "commercial");
    await db.update(s.freelancers).set({ billingMandateAcceptedAt: null }).where(eq(s.freelancers.id, first.id));
    expect((await findCandidates(db, b, "commercial")).some((c) => c.id === first.id)).toBe(false);
    await db.update(s.freelancers).set({ billingMandateAcceptedAt: new Date() }).where(eq(s.freelancers.id, first.id));
    expect((await findCandidates(db, b, "commercial")).some((c) => c.id === first.id)).toBe(true);
  });
});

describe("autofactures", () => {
  it("émet une facture par virement : franchise, TVA d'un assujetti, mandat accepté après coup", async () => {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.ref, "SB-1004-2210"));
    const asg = await loadAssignments(db, b.id);
    const karim = asg.find((a) => a.firstName === "Karim")!;
    const sarah = asg.find((a) => a.role === "commercial" && a.id !== karim.id)!;
    const chloe = asg.find((a) => a.role === "accueil")!;
    await db.update(s.freelancers).set({ vatRegime: "assujetti", vatNumber: "FR12345678901" }).where(eq(s.freelancers.id, sarah.freelancerId));
    await db.update(s.freelancers).set({ billingMandateAcceptedAt: null }).where(eq(s.freelancers.id, chloe.freelancerId));

    for (const a of asg) await validateAssignmentHours(db, a.id, companyId, ownerId);
    expect((await getCompanyBooking(db, b.id, companyId))!.status).toBe("payee");
    const payouts = await db.select().from(s.payouts).where(inArray(s.payouts.assignmentId, asg.map((a) => a.id)));
    const payoutOf = (id: string) => payouts.find((p) => p.assignmentId === id)!;
    const invoices = await invoicesOf(payouts.map((p) => p.id));
    expect(invoices).toHaveLength(2); // Chloé n'a pas encore de mandat
    const notes = await db.select().from(s.notifications).where(eq(s.notifications.userId, adminId));
    expect(notes.some((n) => n.title === "Autofacture en attente")).toBe(true);

    // franchise en base : pas de TVA, net = HT
    const k = invoices.find((i) => i.payoutId === payoutOf(karim.id).id)!;
    expect(k.number).toMatch(/^AF-[0-9A-F]{8}-\d{4}-0001$/);
    expect(k).toMatchObject({ kind: "mission", vatBps: 0, vatCents: 0, amountHtCents: (karim.hourlyRateCents * 16), netCents: payoutOf(karim.id).amountCents });
    expect(k.label).toContain("Les Salons Solutions");
    expect(k.detail).toContain("16 h validées");
    expect((k.supplier as Supplier).address).toBe((await freelancer(karim.freelancerId)).billingAddress);

    // assujetti : TVA à 20 % ajoutée et versée
    const sp = payoutOf(sarah.id);
    const si = invoices.find((i) => i.payoutId === sp.id)!;
    expect(si.vatBps).toBe(2000);
    expect(si.vatCents).toBe(Math.round(si.amountHtCents * 0.2));
    expect(sp.amountCents).toBe(si.amountHtCents + si.vatCents);
    expect((si.supplier as Supplier).vatNumber).toBe("FR12345678901");

    // coordonnées figées : un changement ultérieur ne modifie pas la facture émise
    await db.update(s.freelancers).set({ billingAddress: "1 place Neuve, 13001 Marseille" }).where(eq(s.freelancers.id, karim.freelancerId));
    const [again] = await db.select().from(s.freelancerInvoices).where(eq(s.freelancerInvoices.id, k.id));
    expect((again.supplier as Supplier).address).not.toBe("1 place Neuve, 13001 Marseille");
    expect(await nextSelfBillNumber(db, karim.freelancerId)).toMatch(/-0002$/);

    // Chloé accepte le mandat : sa facture est émise
    const c = await freelancer(chloe.freelancerId);
    await freelancerBilling(db, c, { billingAddress: "3 rue Oberkampf, 75011 Paris", vatRegime: "franchise", vatNumber: "", acceptMandate: true });
    expect((await freelancer(chloe.freelancerId)).billingMandateVersion).toBe(BILLING_MANDATE_VERSION);
    const [ci] = await invoicesOf([payoutOf(chloe.id).id]);
    expect(ci.amountHtCents).toBe(Math.round((chloe.hourlyRateCents * 15 * 60) / 60));
    expect((ci.supplier as Supplier).address).toBe("3 rue Oberkampf, 75011 Paris");

    // relevés : totaux par trimestre de virement
    const rows = await selfBillsFor(db, karim.freelancerId);
    const sum = yearSummary(rows);
    expect(sum.all).toEqual(totals(rows));
    expect(sum.quarters.reduce((n, q) => n + q.netCents, 0)).toBe(sum.all.netCents);
    expect(sum.pending.count + sum.paid.count).toBe(sum.all.count);
  });

  it("facture les indemnités d'annulation sans commission", async () => {
    const [event] = await db.select().from(s.events).where(eq(s.events.slug, "equiphotel-2026"));
    const draft = await createDraft(db, companyId, event.slug);
    const reload = async () => (await getCompanyBooking(db, draft.id, companyId))!;
    await saveEventStep(db, await reload(), { eventId: event.id, days: [...draft.days, "2026-11-01"], startTime: "09:00", endTime: "18:00", stand: "B41" });
    await saveTeamStep(db, await reload(), { positions: { commercial: 1 }, languages: ["Français"], outfit: "exposant" });
    const [ref] = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, companyId));
    await saveBriefStep(db, await reload(), { referentId: ref.id, highlights: "", brief: "", leadTemplateId: null, leadFrequency: "quotidien" });
    await autoSelect(db, await reload());
    await confirmBooking(db, await reload(), ownerId);
    for (const a of await loadAssignments(db, draft.id)) await respondToMission(db, a.id, a.userId, true);
    await cancelBooking(db, await reload(), ownerId, { today: "2026-10-27" });

    const [a] = await loadAssignments(db, draft.id);
    const [p] = await db.select().from(s.payouts).where(eq(s.payouts.assignmentId, a.id));
    const [inv] = await invoicesOf([p.id]);
    expect(inv).toMatchObject({ kind: "indemnite", commissionCents: 0, netCents: p.amountCents });
    expect(inv.label).toMatch(/^Indemnité d’annulation · EquipHotel/);
    expect(inv.detail).toContain("50 %");
  });
});
