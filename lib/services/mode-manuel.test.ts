import { and, eq, inArray } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { commissionFor, commissionText } from "@/lib/commission";
import { lastInitial, nameFor, shortName } from "@/lib/names";
import { socialLinks } from "./accounts";
import { markPaymentReceived, markPayoutPaid, runPayouts } from "./billing";
import {
  advanceBookings,
  autoSelect,
  confirmationIssues,
  confirmBooking,
  createDraft,
  getCompanyBooking,
  loadAssignments,
  respondToMission,
  saveBriefStep,
  saveEventStep,
  saveTeamStep,
  startDraft,
} from "./booking";
import { authorizeContact } from "./contact";
import { declareHours, validateAssignmentHours } from "./hours";
import { publishedReviews, publishReview, submitReview } from "./reviews";

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

afterEach(() => {
  vi.unstubAllEnvs();
});

type Team = Parameters<typeof saveTeamStep>[2];

/** Réservation EquipHotel jusqu'à la sélection automatique de l'équipe. */
async function draftBooking(team: Team, target?: string) {
  const [event] = await db.select().from(s.events).where(eq(s.events.slug, "equiphotel-2026"));
  const draft = await createDraft(db, companyId, event.slug);
  const reload = async () => (await getCompanyBooking(db, draft.id, companyId))!;
  await saveEventStep(db, await reload(), { eventId: event.id, days: draft.days, startTime: "09:00", endTime: "18:00", stand: "B41" });
  await saveTeamStep(db, await reload(), team);
  const [ref] = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, companyId));
  await saveBriefStep(db, await reload(), {
    referentId: ref.id,
    highlights: "Nouvelle gamme LED",
    brief: "Accueil et qualification",
    leadTemplateId: null,
    leadFrequency: "quotidien",
    prospectionTarget: target,
  });
  await autoSelect(db, await reload());
  return reload;
}

/** Confirme, fait accepter toute l'équipe et amène la réservation à la validation des heures. */
async function runToHours(reload: () => ReturnType<typeof getCompanyBooking>) {
  await confirmBooking(db, (await reload())!, ownerId);
  const asg = await loadAssignments(db, (await reload())!.id);
  for (const a of asg) await respondToMission(db, a.id, a.userId, true);
  await advanceBookings(db, "2026-11-06");
  const b = (await reload())!;
  expect(b.status).toBe("heures_a_valider");
  for (const a of asg) await declareHours(db, a.id, a.userId, b.days.map((day) => ({ day, minutes: 480 })), "2026-11-06");
  return { b, asg };
}

describe("noms courts et réseaux", () => {
  it("réduit le nom à l'initiale tant que le contact n'est pas autorisé", () => {
    expect(shortName("Camille", "durand")).toBe("Camille D.");
    expect(shortName("Camille", "")).toBe("Camille");
    expect(lastInitial("Éric")).toBe("É.");
    expect(nameFor("Camille", "Durand", false)).toBe("Camille D.");
    expect(nameFor("Camille", "Durand", true)).toBe("Camille Durand");
  });

  it("exige au moins un réseau et refuse les liens d'un autre site", () => {
    expect(() => socialLinks({ linkedin: "", instagram: "" })).toThrow(/au moins l’un des deux/);
    expect(socialLinks({ linkedin: "linkedin.com/in/camille-durand", instagram: "" })).toEqual({
      linkedinUrl: "https://linkedin.com/in/camille-durand",
      instagramUrl: null,
    });
    expect(socialLinks({ linkedin: "", instagram: "@camille.d" }).instagramUrl).toBe("https://www.instagram.com/camille.d");
    expect(() => socialLinks({ linkedin: "https://evil.example/in/x", instagram: "" })).toThrow(/LinkedIn invalide/);
    expect(() => socialLinks({ linkedin: "", instagram: "https://instagram.com/" })).toThrow(/Instagram invalide/);
  });
});

describe("commission des commerciaux", () => {
  const lead = { commissionType: "lead", commissionLeadCents: 500, commissionSaleBps: 0 };
  const sale = { commissionType: "vente", commissionLeadCents: 0, commissionSaleBps: 550 };

  it("calcule la commission par lead qualifié ou sur les ventes", () => {
    expect(commissionFor(lead, { qualifiedLeads: 12, salesCents: null })).toBe(6000);
    expect(commissionFor(lead, { qualifiedLeads: null, salesCents: 100_00 })).toBe(0);
    expect(commissionFor(sale, { qualifiedLeads: 3, salesCents: 2000_00 })).toBe(110_00);
    expect(commissionFor({ ...sale, commissionType: "aucune" }, { qualifiedLeads: 3, salesCents: 2000_00 })).toBe(0);
    expect(commissionText("fr", lead)).toMatch(/par lead qualifié/);
    expect(commissionText("en", sale)).toMatch(/of sales/);
    expect(commissionText("fr", { ...lead, commissionType: "aucune" })).toBeNull();
  });

  it("refuse une commission hors bornes ou sur les ventes pour la prospection", async () => {
    const [event] = await db.select().from(s.events).where(eq(s.events.slug, "equiphotel-2026"));
    const draft = await createDraft(db, companyId, event.slug);
    const team = (commission: NonNullable<Team["commission"]>, offer: Team["offer"] = "stand"): Team => ({
      positions: offer === "prospection" ? { prospecteur: 2 } : { commercial: 2 },
      languages: ["Français"],
      outfit: "exposant",
      offer,
      commission,
    });
    await expect(saveTeamStep(db, draft, team({ type: "lead", leadCents: 10, saleBps: 0 }))).rejects.toThrow(/par lead invalide/);
    await expect(saveTeamStep(db, draft, team({ type: "vente", leadCents: 0, saleBps: 9000 }))).rejects.toThrow(/ventes invalide/);
    await expect(saveTeamStep(db, draft, team({ type: "vente", leadCents: 0, saleBps: 500 }, "prospection"))).rejects.toThrow(/équipe de stand/);
    await saveTeamStep(db, draft, team({ type: "vente", leadCents: 0, saleBps: 500 }));
    const b = (await getCompanyBooking(db, draft.id, companyId))!;
    expect([b.commissionType, b.commissionSaleBps, b.commissionLeadCents]).toEqual(["vente", 500, 0]);
  });

  it("ajoute la commission à la facture et à la paie du commercial", async () => {
    const reload = await draftBooking({
      positions: { commercial: 2 },
      languages: ["Français"],
      outfit: "exposant",
      commission: { type: "lead", leadCents: 500, saleBps: 0 },
    });
    const { asg } = await runToHours(reload);
    // 10 leads retenus pour le premier ; le second n'en a remonté aucun
    await validateAssignmentHours(db, asg[0].id, companyId, ownerId, undefined, { qualifiedLeads: 10 });
    await validateAssignmentHours(db, asg[1].id, companyId, ownerId);
    const b = (await reload())!;
    expect(b.status).toBe("payee");

    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id));
    const lines = invoice.lines as { label: string; totalCents: number }[];
    const commission = lines.find((l) => l.label.startsWith("Commission"));
    expect(commission).toMatchObject({ label: "Commission · 10 lead(s) qualifié(s)", totalCents: 5000 });
    // sous-total = heures + commission ; les frais de service (dernière ligne) s'y appliquent
    expect(invoice.subtotalCents).toBe(lines.filter((l) => !l.label.startsWith("Frais de service")).reduce((n, l) => n + l.totalCents, 0));
    expect(invoice.serviceFeeCents).toBe(Math.round((invoice.subtotalCents * 1200) / 10000));

    const [first] = await db.select().from(s.payouts).where(eq(s.payouts.assignmentId, asg[0].id));
    const days = b.days.length;
    expect(first.grossCents).toBe(Math.round((asg[0].hourlyRateCents * days * 480) / 60) + 5000);
    const [a0] = await db.select().from(s.assignments).where(eq(s.assignments.id, asg[0].id));
    expect([a0.qualifiedLeads, a0.commissionCents]).toEqual([10, 5000]);
  });
});

describe("prospection autonome", () => {
  it("réserve des prospecteurs seuls, avec des cibles obligatoires", async () => {
    const [event] = await db.select().from(s.events).where(eq(s.events.slug, "equiphotel-2026"));
    const draft = await startDraft(db, companyId, event.slug, "prospection");
    expect(draft.offer).toBe("prospection");
    const reload = async () => (await getCompanyBooking(db, draft.id, companyId))!;
    await saveEventStep(db, await reload(), { eventId: event.id, days: draft.days, startTime: "09:00", endTime: "18:00", stand: "" });
    // les postes de stand ne font pas partie de cette formule
    await expect(saveTeamStep(db, await reload(), { positions: { commercial: 1 }, languages: ["Français"], outfit: "exposant", offer: "prospection" })).rejects.toThrow(
      /prospection/,
    );
    await saveTeamStep(db, await reload(), {
      positions: { prospecteur: 2 },
      languages: ["Français"],
      outfit: "exposant",
      offer: "prospection",
      commission: { type: "lead", leadCents: 800, saleBps: 0 },
    });
    expect((await reload()).outfit).toBe("perso");
    const [ref] = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, companyId));
    const brief = { referentId: ref.id, highlights: "", brief: "", leadTemplateId: null, leadFrequency: "quotidien" as const };
    await expect(saveBriefStep(db, await reload(), brief)).rejects.toThrow(/cibles de la prospection/);
    await saveBriefStep(db, await reload(), { ...brief, prospectionTarget: "Acheteurs de la grande distribution" });
    expect((await reload()).prospectionTarget).toBe("Acheteurs de la grande distribution");
    await autoSelect(db, await reload());
    const asg = await loadAssignments(db, draft.id);
    expect(asg.length).toBeGreaterThan(0);
    expect(asg.every((a) => a.role === "prospecteur")).toBe(true);
    expect(await confirmationIssues(db, await reload())).not.toContain("Décrivez les cibles de la prospection dans le brief.");
  });
});

describe("mode manuel (PAYMENT_MODE=manuel)", () => {
  it("laisse le paiement en attente jusqu'au « Paiement reçu », puis programme la paie sans virement automatique", async () => {
    vi.stubEnv("PAYMENT_MODE", "manuel");
    vi.stubEnv("SUPPORT_EMAIL", "equipe@exemple.fr");
    const reload = await draftBooking({ positions: { commercial: 1 }, languages: ["Français"], outfit: "exposant" });
    const { b, asg } = await runToHours(reload);
    await validateAssignmentHours(db, asg[0].id, companyId, ownerId);
    expect((await reload())!.status).toBe("validee");
    const [payment] = await db.select().from(s.payments).where(eq(s.payments.bookingId, b.id));
    expect(payment.status).toBe("en_attente");
    expect(await db.select().from(s.payouts).where(eq(s.payouts.assignmentId, asg[0].id))).toHaveLength(0);

    // l'équipe est prévenue à l'adresse de contact
    const mails = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.category, "equipe"));
    expect(mails.some((m) => m.subject.includes(b.ref) && m.subject.includes("Facture à encaisser"))).toBe(true);

    await markPaymentReceived(db, adminId, payment.id);
    expect((await reload())!.status).toBe("payee");
    const [payout] = await db.select().from(s.payouts).where(eq(s.payouts.assignmentId, asg[0].id));
    expect(payout.status).toBe("planifie");
    expect(await runPayouts(db, "2099-01-01")).toBe(0);
    await markPayoutPaid(db, adminId, payout.id);
    const [paid] = await db.select().from(s.payouts).where(eq(s.payouts.id, payout.id));
    expect(paid.status).toBe("transfere");
  });

  it("débloque les coordonnées seulement sur une réservation confirmée", async () => {
    const reload = await draftBooking({ positions: { commercial: 1 }, languages: ["Français"], outfit: "exposant" });
    await expect(authorizeContact(db, adminId, (await reload())!.id)).rejects.toThrow(/rien à débloquer/);
    await confirmBooking(db, (await reload())!, ownerId);
    await authorizeContact(db, adminId, (await reload())!.id);
    const b = (await reload())!;
    expect(b.contactAuthorizedAt).not.toBeNull();
    expect(b.contactAuthorizedBy).toBe(adminId);
    expect(await authorizeContact(db, adminId, b.id)).toEqual({ already: true });
  });
});

describe("avis publiés sur l'accueil", () => {
  it("nomme la société seulement avec son accord et réduit le commercial à son initiale", async () => {
    const reload = await draftBooking({ positions: { commercial: 2 }, languages: ["Français"], outfit: "exposant" });
    const { asg } = await runToHours(reload);
    for (const a of asg) await validateAssignmentHours(db, a.id, companyId, ownerId);
    expect((await reload())!.status).toBe("payee");

    await submitReview(db, companyId, asg[0].id, 5, "Très pro, 60 leads en trois jours.", true);
    await submitReview(db, companyId, asg[1].id, 4, "", false);
    const mine = await db
      .select()
      .from(s.reviews)
      .where(and(eq(s.reviews.companyId, companyId), inArray(s.reviews.freelancerId, asg.map((a) => a.freelancerId))));
    const withComment = mine.find((r) => r.comment)!;
    const without = mine.find((r) => !r.comment)!;
    expect(withComment.publicConsent).toBe(true);

    await expect(publishReview(db, adminId, without.id, true)).rejects.toThrow(/commentaire/);
    expect((await publishedReviews(db)).some((r) => r.id === withComment.id)).toBe(false);
    await publishReview(db, adminId, withComment.id, true);
    const shown = (await publishedReviews(db)).find((r) => r.id === withComment.id)!;
    expect(shown).toMatchObject({ rating: 5, company: "Maison Lumen", event: expect.stringContaining("EquipHotel") });
    expect(shown.freelancer).toMatch(/^\S+( \S+)* [A-ZÀ-Ý]\.$/);

    // sans accord : « Exposant » et le secteur, jamais le nom
    await db.update(s.reviews).set({ publicConsent: false }).where(eq(s.reviews.id, withComment.id));
    const anon = (await publishedReviews(db)).find((r) => r.id === withComment.id)!;
    expect(anon.company).toBeNull();

    await publishReview(db, adminId, withComment.id, false);
    expect((await publishedReviews(db)).some((r) => r.id === withComment.id)).toBe(false);
  });
});
