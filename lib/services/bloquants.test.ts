import { and, eq, inArray, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { payoutCents } from "@/lib/pricing";
import { changePassword, confirmEmailChange, login, registerAccount, requestEmailChange, resetPassword } from "./accounts";
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
  withdrawFromMission,
} from "./booking";
import { cancelBooking } from "./cancellation";
import { creditableCents, issueCreditNote } from "./credit-notes";
import { autoValidateHours, declareHours, respondToAdjustment, validateAssignmentHours } from "./hours";

const TODAY = "2026-10-27";
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

/** Réservation EquipHotel (1er au 5 nov., montage compris), acceptée par toute l'équipe. */
async function acceptedBooking() {
  const [event] = await db.select().from(s.events).where(eq(s.events.slug, "equiphotel-2026"));
  const draft = await createDraft(db, companyId, event.slug);
  const reload = async () => (await getCompanyBooking(db, draft.id, companyId))!;
  await saveEventStep(db, await reload(), { eventId: event.id, days: [...draft.days, "2026-11-01"], startTime: "09:00", endTime: "18:00", stand: "B41" });
  await saveTeamStep(db, await reload(), { positions: { commercial: 2, accueil: 1 }, languages: ["Français"], outfit: "exposant" });
  const [ref] = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, companyId));
  await saveBriefStep(db, await reload(), { referentId: ref.id, highlights: "", brief: "", leadTemplateId: null, leadFrequency: "quotidien" });
  await autoSelect(db, await reload());
  await confirmBooking(db, await reload(), ownerId);
  for (const a of await loadAssignments(db, draft.id)) await respondToMission(db, a.id, a.userId, true);
  return reload;
}

const titles = async (userId: string) => (await db.select().from(s.notifications).where(eq(s.notifications.userId, userId))).map((n) => n.title);

describe("désistement après acceptation", () => {
  it("propose un remplaçant (au même tarif ou moins en priorité) et prévient l'exposant et l'équipe", async () => {
    const reload = await acceptedBooking();
    let b = await reload();
    expect(b.status).toBe("confirmee");
    const team = await loadAssignments(db, b.id);
    const a = team.find((x) => x.role === "commercial")!;
    const pool = await findCandidates(db, b, "commercial", team.map((x) => x.freelancerId));
    const expected = pool.find((c) => c.hourlyRateCents <= a.hourlyRateCents) ?? pool[0];

    await expect(withdrawFromMission(db, a.id, a.userId, "malade", TODAY)).rejects.toThrow(/raison/);
    await expect(withdrawFromMission(db, a.id, a.userId, "Hospitalisation prévue ce jour-là", "2026-11-01")).rejects.toThrow(/commencé/);
    expect(await withdrawFromMission(db, a.id, a.userId, "Hospitalisation prévue ce jour-là", TODAY)).toEqual({ replaced: true, daysBefore: 5 });

    b = await reload();
    expect(b.status).toBe("partielle");
    const after = await loadAssignments(db, b.id);
    expect(after.find((x) => x.id === a.id)?.status).toBe("desistee");
    const replacement = after.find((x) => x.status === "proposee");
    expect(replacement?.freelancerId).toBe(expected.id);
    const [mine] = await db.select().from(s.assignments).where(eq(s.assignments.id, a.id));
    expect(mine.withdrawalReason).toBe("Hospitalisation prévue ce jour-là");
    const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, a.freelancerId));
    expect(f.acceptRateBps).toBeLessThan(10000);
    expect((await titles(ownerId)).some((t) => t.includes("s’est désisté·e"))).toBe(true);
    expect((await titles(adminId)).some((t) => t === `Désistement (${b.ref})`)).toBe(true);
    await expect(withdrawFromMission(db, a.id, a.userId, "Hospitalisation prévue ce jour-là", TODAY)).rejects.toThrow(/mission acceptée/);

    // une annulation ultérieure garde la trace du désistement
    await cancelBooking(db, b, ownerId, { waive: true });
    expect((await loadAssignments(db, b.id)).find((x) => x.id === a.id)?.status).toBe("desistee");
  });

  it("alerte l'équipe Standby quand aucun remplaçant n'est libre", async () => {
    const reload = await acceptedBooking();
    const b = await reload();
    const a = (await loadAssignments(db, b.id)).find((x) => x.role === "accueil")!;
    await db
      .update(s.freelancers)
      .set({ blockedReason: "test" })
      .where(and(sql`${s.freelancers.roles} @> array['accueil']::text[]`, sql`${s.freelancers.id} <> ${a.freelancerId}`));
    try {
      expect(await withdrawFromMission(db, a.id, a.userId, "Empêchement familial imprévu", "2026-10-31")).toEqual({ replaced: false, daysBefore: 1 });
      expect((await titles(adminId)).some((t) => t === `Désistement de dernière minute (${b.ref})`)).toBe(true);
    } finally {
      await db.update(s.freelancers).set({ blockedReason: null }).where(eq(s.freelancers.blockedReason, "test"));
      await cancelBooking(db, await reload(), ownerId, { waive: true });
    }
  });
});

describe("contestation des heures par le commercial", () => {
  it("ajustement à la baisse : contestation puis arbitrage, accord tacite à 48 h, facturation après accord", async () => {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.ref, "SB-1004-2210"));
    const asg = await loadAssignments(db, b.id);
    const karim = asg.find((a) => a.firstName === "Karim")!;
    const sarah = asg.find((a) => a.role === "commercial" && a.id !== karim.id)!;
    const chloe = asg.find((a) => a.role === "accueil")!;
    const sheetsOf = (id: string) => db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, id));

    // sans baisse : validé directement
    expect(await validateAssignmentHours(db, chloe.id, companyId, ownerId)).toEqual({ adjusted: false });

    // baisse (16 h → 14 h) : en attente de l'accord de Karim, plus modifiable de part et d'autre
    expect(await validateAssignmentHours(db, karim.id, companyId, ownerId, 14 * 60, { note: "Arrivé à 11 h le 2e jour" })).toEqual({ adjusted: true });
    expect((await sheetsOf(karim.id)).every((t) => t.status === "ajuste")).toBe(true);
    expect((await titles(karim.userId)).some((t) => t === `Heures ajustées (${b.ref})`)).toBe(true);
    await expect(validateAssignmentHours(db, karim.id, companyId, ownerId)).rejects.toThrow(/attendent/);
    await declareHours(db, karim.id, karim.userId, [{ day: b.days[1], minutes: 600 }], "2026-10-16");
    expect((await sheetsOf(karim.id)).reduce((n, t) => n + t.minutesDeclared, 0)).toBe(16 * 60);

    // contestation
    await expect(respondToAdjustment(db, karim.id, karim.userId, false, "non")).rejects.toThrow(/Expliquez/);
    await respondToAdjustment(db, karim.id, karim.userId, false, "Présent dès 9 h, badge scanné à l’entrée du hall.");
    expect((await sheetsOf(karim.id)).every((t) => t.status === "conteste")).toBe(true);
    expect((await titles(adminId)).some((t) => t === `Heures contestées (${b.ref})`)).toBe(true);
    expect((await titles(ownerId)).some((t) => t.includes("conteste l’ajustement"))).toBe(true);
    await expect(respondToAdjustment(db, karim.id, karim.userId, true)).rejects.toThrow(/Aucun ajustement/);

    // Sarah ne répond pas : l'ajustement est retenu au bout de 48 h
    await validateAssignmentHours(db, sarah.id, companyId, ownerId, 15 * 60);
    expect(await autoValidateHours(db, "2026-10-16", new Date(Date.now() + 47 * 3600_000))).toBe(0);
    expect(await autoValidateHours(db, "2026-10-16", new Date(Date.now() + 49 * 3600_000))).toBe(1);
    expect((await sheetsOf(sarah.id)).every((t) => t.status === "valide")).toBe(true);

    // les heures contestées attendent l'arbitrage, même passé J+3
    await autoValidateHours(db, "2026-10-30", new Date(Date.now() + 49 * 3600_000));
    expect((await sheetsOf(karim.id)).every((t) => t.status === "conteste")).toBe(true);
    expect((await getCompanyBooking(db, b.id, companyId))!.status).toBe("heures_a_valider");
    expect(await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id))).toHaveLength(0);

    // arbitrage de l'équipe : 15 h, définitif ; la réservation est facturée et la paie programmée
    expect(await validateAssignmentHours(db, karim.id, companyId, adminId, 15 * 60, { final: true })).toEqual({ adjusted: false });
    expect((await getCompanyBooking(db, b.id, companyId))!.status).toBe("payee");
    const payouts = await db.select().from(s.payouts).where(inArray(s.payouts.assignmentId, [karim.id, sarah.id]));
    expect(payouts.find((p) => p.assignmentId === karim.id)?.amountCents).toBe(payoutCents(karim.hourlyRateCents, 15 * 60, 0));
    expect(payouts.find((p) => p.assignmentId === sarah.id)?.amountCents).toBe(payoutCents(sarah.hourlyRateCents, 15 * 60, 0));
  });
});

describe("avoirs et remboursements", () => {
  it("rembourse une facture réglée, dans la limite du reste à créditer", async () => {
    const reload = await acceptedBooking();
    await cancelBooking(db, await reload(), ownerId, { today: TODAY }); // 50 % : facture d'annulation réglée
    const b = await reload();
    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id));
    const payoutsBefore = await db.select().from(s.payouts).where(inArray(s.payouts.assignmentId, (await loadAssignments(db, b.id)).map((a) => a.id)));

    await expect(issueCreditNote(db, adminId, invoice.id, { amountTtcCents: invoice.totalTtcCents + 1, reason: "Erreur de barème" })).rejects.toThrow(/reste à créditer/);
    await expect(issueCreditNote(db, adminId, invoice.id, { amountTtcCents: 1000, reason: "" })).rejects.toThrow(/motif/);

    const first = await issueCreditNote(db, adminId, invoice.id, { amountTtcCents: 12000, reason: "Geste commercial" });
    expect(first.number).toMatch(/^A-\d{4}-00001$/);
    expect(first.totalHtCents).toBe(Math.round((12000 * invoice.totalHtCents) / invoice.totalTtcCents));
    expect(first.totalHtCents + first.vatCents).toBe(12000);
    expect(first.refundStatus).toBe("rembourse"); // simulé sans Stripe
    expect(await creditableCents(db, invoice.id)).toBe(invoice.totalTtcCents - 12000);
    expect((await titles(ownerId)).includes(`Avoir ${first.number}`)).toBe(true);

    const rest = await issueCreditNote(db, adminId, invoice.id, { amountTtcCents: invoice.totalTtcCents - 12000, reason: "Annulation offerte" });
    expect(rest.number).toMatch(/-00002$/);
    expect(await creditableCents(db, invoice.id)).toBe(0);
    await expect(issueCreditNote(db, adminId, invoice.id, { amountTtcCents: 100, reason: "Encore" })).rejects.toThrow(/reste à créditer/);

    // les indemnités des commerciaux ne bougent pas
    const payoutsAfter = await db.select().from(s.payouts).where(inArray(s.payouts.id, payoutsBefore.map((p) => p.id)));
    expect(payoutsAfter.map((p) => p.amountCents).sort()).toEqual(payoutsBefore.map((p) => p.amountCents).sort());
  });

  it("déduit l'avoir d'un prélèvement pas encore abouti ; à zéro, la réservation est soldée", async () => {
    const reload = await acceptedBooking();
    await cancelBooking(db, await reload(), ownerId, { today: TODAY });
    const b = await reload();
    const ids = (await loadAssignments(db, b.id)).map((a) => a.id);
    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id));
    // prélèvement refusé : rien n'est encore versé ni facturé par les commerciaux
    const early = await db.select({ id: s.payouts.id }).from(s.payouts).where(inArray(s.payouts.assignmentId, ids));
    await db.delete(s.freelancerInvoices).where(inArray(s.freelancerInvoices.payoutId, early.map((p) => p.id)));
    await db.delete(s.payouts).where(inArray(s.payouts.assignmentId, ids));
    await db.update(s.payments).set({ status: "echoue", error: "Mandat révoqué" }).where(eq(s.payments.bookingId, b.id));

    const partial = await issueCreditNote(db, adminId, invoice.id, { amountTtcCents: 1000, reason: "Erreur de saisie" });
    expect(partial.refundStatus).toBe("aucun");
    let [payment] = await db.select().from(s.payments).where(eq(s.payments.bookingId, b.id));
    expect(payment).toMatchObject({ amountCents: invoice.totalTtcCents - 1000, status: "echoue" });

    await issueCreditNote(db, adminId, invoice.id, { amountTtcCents: invoice.totalTtcCents - 1000, reason: "Annulation offerte" });
    [payment] = await db.select().from(s.payments).where(eq(s.payments.bookingId, b.id));
    expect(payment).toMatchObject({ amountCents: 0, status: "reussi" });
    expect(await db.select().from(s.payouts).where(inArray(s.payouts.assignmentId, ids))).toHaveLength(3);
  });
});

describe("mot de passe et adresse e-mail", () => {
  it("change le mot de passe avec l'actuel et ferme les autres sessions", async () => {
    const p = await registerAccount(db, { email: "compte@e2e.test", password: "ancien-mdp-123", role: "commercial", firstName: "Nina", lastName: "Roux" });
    await expect(changePassword(db, p, "faux-mdp-000", "nouveau-mdp-456")).rejects.toThrow(/incorrect/);
    await expect(changePassword(db, p, "ancien-mdp-123", "court")).rejects.toThrow(/10 caractères/);
    expect(await changePassword(db, p, "ancien-mdp-123", "nouveau-mdp-456")).toBe(1);
    expect(await login(db, p.email, "ancien-mdp-123")).toBeNull();
    expect((await login(db, p.email, "nouveau-mdp-456"))?.sessionVersion).toBe(1);
    const [alert] = await db.select().from(s.emailOutbox).where(and(eq(s.emailOutbox.to, p.email), eq(s.emailOutbox.subject, "Votre mot de passe standby a été modifié")));
    expect(alert).toBeDefined();

    // une réinitialisation ferme aussi les sessions
    const token = "jeton-de-test-reinitialisation";
    await db.insert(s.passwordResets).values({ token, userId: p.id, expiresAt: new Date(Date.now() + 3600_000) });
    await resetPassword(db, token, "encore-un-mdp-789");
    expect((await login(db, p.email, "encore-un-mdp-789"))?.sessionVersion).toBe(2);
  });

  it("change l'adresse une fois le lien envoyé à la nouvelle confirmé", async () => {
    const p = await registerAccount(db, { email: "avant@e2e.test", password: "motdepasse-123", role: "exposant", firstName: "Hugo", lastName: "Lenoir" });
    await expect(requestEmailChange(db, p, "claire@maison-lumen.test", "motdepasse-123")).rejects.toThrow(/déjà utilisée/);
    await expect(requestEmailChange(db, p, "apres@e2e.test", "mauvais")).rejects.toThrow(/incorrect/);
    await requestEmailChange(db, p, "Apres@E2E.test", "motdepasse-123");

    const [mail] = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.to, "apres@e2e.test"));
    const token = mail.link!.split("/nouvelle-adresse/")[1];
    const [alert] = await db.select().from(s.emailOutbox).where(and(eq(s.emailOutbox.to, "avant@e2e.test"), eq(s.emailOutbox.subject, "Changement d’adresse e-mail demandé")));
    expect(alert.text).toContain("apres@e2e.test");
    expect(await login(db, "avant@e2e.test", "motdepasse-123")).not.toBeNull(); // valable jusqu'à la confirmation

    const updated = await confirmEmailChange(db, token);
    expect(updated.email).toBe("apres@e2e.test");
    expect(updated.emailVerifiedAt).not.toBeNull();
    expect(await login(db, "apres@e2e.test", "motdepasse-123")).not.toBeNull();
    expect(await login(db, "avant@e2e.test", "motdepasse-123")).toBeNull();
    await expect(confirmEmailChange(db, token)).rejects.toThrow(/déjà utilisé/);
    await expect(confirmEmailChange(db, `${token}x`)).rejects.toThrow(/invalide/);
  });
});
