import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { cancellationRate } from "@/lib/cancellation";
import { PRICING_DEFAULTS } from "@/lib/domain";
import { login, freelancerIdentity, registerAccount } from "./accounts";
import type { CancellationRecord } from "./billing";
import {
  autoSelect,
  confirmBooking,
  createDraft,
  getCompanyBooking,
  loadAssignments,
  respondToMission,
  saveBriefStep,
  saveEventStep,
  saveTeamStep,
} from "./booking";
import { cancelBooking } from "./cancellation";
import { validateAssignmentHours } from "./hours";
import { deleteAccount, deletionBlockers, exportUserData, purgeExpiredData } from "./privacy";
import { sendReminders } from "./reminders";
import { deleteReview, submitReview } from "./reviews";

let db: Db;
let companyId: string;
let ownerId: string;

beforeAll(async () => {
  db = await createPgliteDb(null, true);
  const [c] = await db.select().from(s.companies).where(eq(s.companies.name, "Maison Lumen"));
  companyId = c.id;
  ownerId = c.ownerId;
});

/** Réservation EquipHotel confirmée (5 jours, montage compris), acceptée par toute l'équipe. */
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

describe("barème d'annulation", () => {
  const p = {
    freeDays: PRICING_DEFAULTS.cancel_free_days.value,
    tier1Days: PRICING_DEFAULTS.cancel_tier1_days.value,
    tier1Bps: PRICING_DEFAULTS.cancel_tier1_bps.value,
    tier2Days: PRICING_DEFAULTS.cancel_tier2_days.value,
    tier2Bps: PRICING_DEFAULTS.cancel_tier2_bps.value,
    lastBps: PRICING_DEFAULTS.cancel_last_bps.value,
  };
  it("applique les paliers par défaut", () => {
    expect(cancellationRate(20, p).bps).toBe(0);
    expect(cancellationRate(14, p).bps).toBe(0);
    expect(cancellationRate(10, p).bps).toBe(3000);
    expect(cancellationRate(5, p).bps).toBe(5000);
    expect(cancellationRate(1, p).bps).toBe(10000);
    expect(cancellationRate(-1, p).bps).toBe(10000);
  });

  it("facture les frais et verse les indemnités aux commerciaux engagés", async () => {
    const reload = await acceptedBooking();
    const b = await reload();
    const record = await cancelBooking(db, b, ownerId, { today: "2026-10-27" }); // 5 jours avant le montage du 1er nov.
    expect(record.bps).toBe(5000);
    expect(record.compensations).toHaveLength(3);
    const after = await reload();
    expect(after.status).toBe("annulee");
    expect((after.cancellation as CancellationRecord).totalHtCents).toBe(record.totalHtCents);

    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id));
    expect(invoice.totalTtcCents).toBe(record.totalTtcCents);
    const [payment] = await db.select().from(s.payments).where(eq(s.payments.bookingId, b.id));
    expect(payment.status).toBe("reussi"); // paiement simulé sans Stripe
    const asg = await loadAssignments(db, b.id);
    const payouts = await db.select().from(s.payouts);
    const mine = payouts.filter((x) => asg.some((a) => a.id === x.assignmentId));
    expect(mine).toHaveLength(3);
    const minutes = 5 * 480;
    for (const a of asg) {
      expect(mine.find((x) => x.assignmentId === a.id)!.amountCents).toBe(Math.round((a.hourlyRateCents * minutes) / 60 / 2));
    }
    // frais de l'exposant = indemnités + frais de service
    expect(record.subtotalCents).toBe(mine.reduce((n, x) => n + x.amountCents, 0));
  });

  it("annule sans frais longtemps à l'avance, ou par geste commercial", async () => {
    const early = await acceptedBooking();
    const r1 = await cancelBooking(db, await early(), ownerId, { today: "2026-10-01" });
    expect(r1.totalHtCents).toBe(0);
    expect(await db.select().from(s.invoices).where(eq(s.invoices.bookingId, (await early()).id))).toHaveLength(0);

    const late = await acceptedBooking();
    const r2 = await cancelBooking(db, await late(), ownerId, { today: "2026-10-31", waive: true });
    expect(r2.waived).toBe(true);
    expect(r2.totalHtCents).toBe(0);
    expect(r2.compensations).toEqual([]);
  });
});

describe("avis des exposants", () => {
  it("note une fois par personne après validation des heures et recalcule la moyenne", async () => {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.ref, "SB-1004-2210"));
    const asg = await loadAssignments(db, b.id);
    const karim = asg.find((a) => a.firstName === "Karim")!;
    await expect(submitReview(db, companyId, karim.id, 5, "Top")).rejects.toThrow(/heures validées/);
    for (const a of asg) await validateAssignmentHours(db, a.id, companyId, ownerId);

    const [before] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, karim.freelancerId));
    await submitReview(db, companyId, karim.id, 5, "Très bon pitch, leads qualifiés.");
    const [after] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, karim.freelancerId));
    expect(after.ratingsCount).toBe(before.ratingsCount + 1);
    expect(after.ratingX10).toBe(Math.round((before.ratingX10 * before.ratingsCount + 50) / (before.ratingsCount + 1)));
    await expect(submitReview(db, companyId, karim.id, 4, "")).rejects.toThrow(/déjà noté/);

    const [review] = await db.select().from(s.reviews).where(eq(s.reviews.freelancerId, karim.freelancerId));
    const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
    await deleteReview(db, admin.id, review.id);
    const [restored] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, karim.freelancerId));
    expect(restored.ratingsCount).toBe(before.ratingsCount);
  });
});

describe("rappels J-7 et J-2", () => {
  it("envoie chaque rappel une seule fois", async () => {
    const reload = await acceptedBooking();
    const b = await reload();
    expect(await sendReminders(db, "2026-10-20")).toBe(0); // 12 jours avant
    expect(await sendReminders(db, "2026-10-28")).toBe(1); // J-4 : rappel J-7
    expect(await sendReminders(db, "2026-10-28")).toBe(0);
    expect(await sendReminders(db, "2026-10-30")).toBe(1); // J-2
    const sent = await db.select().from(s.bookingReminders).where(eq(s.bookingReminders.bookingId, b.id));
    expect(sent.map((r) => r.kind).sort()).toEqual(["j2", "j7"]);
    const notes = await db.select().from(s.notifications).where(eq(s.notifications.userId, ownerId));
    expect(notes.some((n) => n.title.startsWith("Votre équipe dans 4 jours"))).toBe(true);
    expect(notes.some((n) => n.title.startsWith("Briefing de votre équipe"))).toBe(true);
    await cancelBooking(db, await reload(), ownerId, { waive: true });
  });
});

describe("RGPD", () => {
  it("exporte les données d'un commercial", async () => {
    const [p] = await db.select().from(s.profiles).where(eq(s.profiles.email, "karim.benali@standby.test"));
    const data = (await exportUserData(db, p.id)) as { profil: { email: string }; commercial: { missions: unknown[] } };
    expect(data.profil.email).toBe(p.email);
    expect(data.commercial.missions.length).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toContain("stripeAccountId");
  });

  it("bloque la suppression en cas d'engagements, sinon anonymise", async () => {
    expect(await deletionBlockers(db, ownerId)).not.toEqual([]);

    const profile = await registerAccount(db, {
      email: "a-supprimer@e2e.test",
      password: "motdepasse-test",
      role: "commercial",
      firstName: "Léo",
      lastName: "Dupont",
    });
    await freelancerIdentity(db, profile.id, { firstName: "Léo", lastName: "Dupont", phone: "", city: "Lyon", bio: "" });
    expect(await deletionBlockers(db, profile.id)).toEqual([]);
    await deleteAccount(db, profile.id);
    const [after] = await db.select().from(s.profiles).where(eq(s.profiles.id, profile.id));
    expect(after.email).toMatch(/@compte-supprime\.invalid$/);
    expect(after.lastName).toBe("supprimé");
    expect(await login(db, "a-supprimer@e2e.test", "motdepasse-test")).toBeNull();
    const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.userId, profile.id));
    expect(f.status).toBe("refuse");
  });

  it("purge les leads au-delà de la durée de conservation", async () => {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.ref, "SB-1004-2210"));
    const [a] = await loadAssignments(db, b.id);
    const [batch] = await db
      .insert(s.leadBatches)
      .values({ assignmentId: a.id, bookingId: b.id, source: "xlsx", rowsCount: 2, status: "envoye", createdAt: new Date("2025-01-01T00:00:00Z") })
      .returning();
    await db.insert(s.leads).values([
      { batchId: batch.id, bookingId: b.id, data: { Nom: "A" } },
      { batchId: batch.id, bookingId: b.id, data: { Nom: "B" } },
    ]);
    const res = await purgeExpiredData(db, new Date("2026-10-27T00:00:00Z"));
    expect(res.leads).toBe(2);
    expect(await db.select().from(s.leadBatches).where(and(eq(s.leadBatches.id, batch.id)))).toHaveLength(0);
  });
});
