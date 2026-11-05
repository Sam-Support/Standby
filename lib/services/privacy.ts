import { and, eq, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { deleteIdentity } from "@/lib/auth/provider";
import { audit } from "@/lib/notify";
import { getPricing } from "@/lib/settings";
import { deleteFile } from "@/lib/storage";
import { AccountError } from "./accounts";

// identifiants techniques de prestataires : sans intérêt pour la personne, non exportés
function withoutKeys<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k as keyof T)));
}

/** Export RGPD (droit d'accès et de portabilité) : toutes les données liées au compte, en JSON. */
export async function exportUserData(db: Db, userId: string) {
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, userId));
  if (!profile) throw new AccountError("Compte introuvable.");
  const notifications = await db.select().from(s.notifications).where(eq(s.notifications.userId, userId));
  const messages = await db.select().from(s.contactMessages).where(eq(s.contactMessages.email, profile.email));
  const out: Record<string, unknown> = {
    exportéLe: new Date().toISOString(),
    profil: { email: profile.email, rôle: profile.role, prénom: profile.firstName, nom: profile.lastName, téléphone: profile.phone, crééLe: profile.createdAt, emailConfirméLe: profile.emailVerifiedAt },
    notifications: notifications.map((n) => ({ titre: n.title, message: n.body, lien: n.link, lueLe: n.readAt, crééeLe: n.createdAt })),
    messagesDeContact: messages.map((m) => ({ sujet: m.subject, message: m.message, référence: m.bookingRef, envoyéLe: m.createdAt })),
  };

  const [company] = await db.select().from(s.companies).where(eq(s.companies.ownerId, userId));
  if (company) {
    const companyData = withoutKeys(company, ["stripeCustomerId", "stripePaymentMethodId"]);
    const bookings = await db
      .select({ b: s.bookings, e: s.events })
      .from(s.bookings)
      .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
      .where(eq(s.bookings.companyId, company.id));
    const ids = bookings.map((x) => x.b.id);
    const invoices = ids.length ? await db.select().from(s.invoices).where(inArray(s.invoices.bookingId, ids)) : [];
    out.entreprise = {
      ...companyData,
      référents: await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, company.id)),
      templatesDeLeads: await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.companyId, company.id)),
      réservations: bookings.map(({ b, e }) => ({
        référence: b.ref,
        événement: e?.name ?? null,
        jours: b.days,
        horaires: `${b.startTime}-${b.endTime}`,
        statut: b.status,
        brief: b.brief,
        totalHtCentimes: b.totalHtCents,
        totalTtcCentimes: b.totalTtcCents,
        annulation: b.cancellation,
      })),
      factures: invoices,
      avoirs: invoices.length
        ? (await db.select().from(s.creditNotes).where(inArray(s.creditNotes.invoiceId, invoices.map((i) => i.id)))).map((n) => withoutKeys(n, ["stripeRefundId", "createdBy"]))
        : [],
      avisDonnés: await db.select().from(s.reviews).where(eq(s.reviews.companyId, company.id)),
    };
  }

  const [freelancer] = await db.select().from(s.freelancers).where(eq(s.freelancers.userId, userId));
  if (freelancer) {
    const freelancerData = withoutKeys(freelancer, ["stripeAccountId"]);
    const missions = await db
      .select({ a: s.assignments, b: s.bookings })
      .from(s.assignments)
      .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
      .where(eq(s.assignments.freelancerId, freelancer.id));
    const ids = missions.map((m) => m.a.id);
    out.commercial = {
      ...freelancerData,
      documents: (await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, freelancer.id))).map((d) => ({
        type: d.type,
        fichier: d.filename,
        statut: d.status,
        commentaire: d.comment,
        déposéLe: d.createdAt,
      })),
      missions: missions.map(({ a, b }) => ({ référence: b.ref, poste: a.role, tauxHoraireCentimes: a.hourlyRateCents, statut: a.status, jours: b.days })),
      heures: ids.length ? await db.select().from(s.timesheets).where(inArray(s.timesheets.assignmentId, ids)) : [],
      virements: await db.select().from(s.payouts).where(eq(s.payouts.freelancerId, freelancer.id)),
      autofactures: await db.select().from(s.freelancerInvoices).where(eq(s.freelancerInvoices.freelancerId, freelancer.id)),
      avisReçus: await db.select().from(s.reviews).where(eq(s.reviews.freelancerId, freelancer.id)),
    };
  }
  return out;
}

const OPEN_BOOKINGS = ["envoyee", "partielle", "confirmee", "en_cours", "heures_a_valider", "validee"] as const;

/** Ce qui empêche la suppression immédiate (engagements en cours, sommes dues). */
export async function deletionBlockers(db: Db, userId: string): Promise<string[]> {
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, userId));
  if (!profile) return ["Compte introuvable."];
  if (profile.role === "admin") return ["Un compte administrateur se supprime par un autre administrateur, pas depuis cette page."];
  const out: string[] = [];
  const [company] = await db.select().from(s.companies).where(eq(s.companies.ownerId, userId));
  if (company) {
    const open = await db
      .select({ ref: s.bookings.ref })
      .from(s.bookings)
      .where(and(eq(s.bookings.companyId, company.id), inArray(s.bookings.status, [...OPEN_BOOKINGS])));
    if (open.length) out.push(`Réservations en cours : ${open.map((o) => o.ref).join(", ")}. Annulez-les ou attendez leur règlement.`);
    const unpaid = await db
      .select({ id: s.payments.id })
      .from(s.payments)
      .innerJoin(s.bookings, eq(s.bookings.id, s.payments.bookingId))
      .where(and(eq(s.bookings.companyId, company.id), inArray(s.payments.status, ["en_attente", "en_cours", "echoue"])));
    if (unpaid.length) out.push("Un paiement est en attente : réglez-le avant de supprimer le compte.");
    const refunds = await db
      .select({ id: s.creditNotes.id })
      .from(s.creditNotes)
      .innerJoin(s.invoices, eq(s.invoices.id, s.creditNotes.invoiceId))
      .innerJoin(s.bookings, eq(s.bookings.id, s.invoices.bookingId))
      .where(and(eq(s.bookings.companyId, company.id), inArray(s.creditNotes.refundStatus, ["en_cours", "echoue"])));
    if (refunds.length) out.push("Un remboursement est en cours : la suppression sera possible une fois le remboursement reçu.");
  }
  const [freelancer] = await db.select().from(s.freelancers).where(eq(s.freelancers.userId, userId));
  if (freelancer) {
    const active = await db
      .select({ ref: s.bookings.ref })
      .from(s.assignments)
      .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
      .where(and(eq(s.assignments.freelancerId, freelancer.id), eq(s.assignments.status, "acceptee"), inArray(s.bookings.status, [...OPEN_BOOKINGS])));
    if (active.length) out.push(`Missions acceptées en cours : ${active.map((a) => a.ref).join(", ")}.`);
    const due = await db.select({ id: s.payouts.id }).from(s.payouts).where(and(eq(s.payouts.freelancerId, freelancer.id), eq(s.payouts.status, "planifie")));
    if (due.length) out.push("Un virement vous est encore dû : la suppression sera possible après son versement.");
  }
  return out;
}

/**
 * Droit à l'effacement. Les pièces comptables (factures, réservations, heures, virements) doivent être
 * conservées 10 ans : elles restent, rattachées à un profil anonymisé. Tout le reste est supprimé.
 */
export async function deleteAccount(db: Db, userId: string) {
  const blockers = await deletionBlockers(db, userId);
  if (blockers.length) throw new AccountError(blockers.join(" "));
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, userId));

  const [company] = await db.select().from(s.companies).where(eq(s.companies.ownerId, userId));
  if (company) {
    await deleteFile(company.brochurePath);
    const bookings = await db.select().from(s.bookings).where(eq(s.bookings.companyId, company.id));
    for (const b of bookings) await deleteFile(b.brochurePath);
    await purgeLeads(db, bookings.map((b) => b.id));
    await db.delete(s.bookings).where(and(eq(s.bookings.companyId, company.id), eq(s.bookings.status, "brouillon")));
    await db.delete(s.crmConnections).where(eq(s.crmConnections.companyId, company.id));
    await db.delete(s.favorites).where(eq(s.favorites.companyId, company.id));
    await db.update(s.companyReferents).set({ name: "Référent supprimé", title: null, phone: null }).where(eq(s.companyReferents.companyId, company.id));
    await db
      .update(s.companies)
      .set({ website: null, linkedin: null, brochurePath: null, brochureName: null, crmAdminEmail: null, stripePaymentMethodId: null })
      .where(eq(s.companies.id, company.id));
  }

  const [freelancer] = await db.select().from(s.freelancers).where(eq(s.freelancers.userId, userId));
  if (freelancer) {
    const docs = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, freelancer.id));
    for (const d of docs) await deleteFile(d.path);
    await db.delete(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, freelancer.id));
    await db.delete(s.favorites).where(eq(s.favorites.freelancerId, freelancer.id));
    await db.delete(s.reviews).where(eq(s.reviews.freelancerId, freelancer.id));
    await db
      .update(s.freelancers)
      .set({
        city: "",
        bio: null,
        roles: [],
        specialties: [],
        languages: [],
        topSize: null,
        pantsSize: null,
        shoeSize: null,
        siret: null,
        status: "refuse",
        payoutsEnabled: false,
        ratingX10: 0,
        ratingsCount: 0,
      })
      .where(eq(s.freelancers.id, freelancer.id));
  }

  await db.delete(s.notifications).where(eq(s.notifications.userId, userId));
  await db.delete(s.passwordResets).where(eq(s.passwordResets.userId, userId));
  await db.delete(s.contactMessages).where(eq(s.contactMessages.email, profile.email));
  await deleteIdentity(db, userId);
  await db
    .update(s.profiles)
    .set({ email: `supprime-${userId}@compte-supprime.invalid`, firstName: "Compte", lastName: "supprimé", phone: null, emailVerifiedAt: null })
    .where(eq(s.profiles.id, userId));
  await audit(db, userId, "account.delete", "profile", userId);
}

async function purgeLeads(db: Db, bookingIds: string[]) {
  if (bookingIds.length === 0) return 0;
  const batches = await db.select({ id: s.leadBatches.id }).from(s.leadBatches).where(inArray(s.leadBatches.bookingId, bookingIds));
  if (batches.length === 0) return 0;
  const cards = await db.select().from(s.businessCards).where(inArray(s.businessCards.batchId, batches.map((b) => b.id)));
  for (const c of cards) await deleteFile(c.path);
  const deleted = await db.delete(s.leads).where(inArray(s.leads.bookingId, bookingIds)).returning({ id: s.leads.id });
  await db.delete(s.leadBatches).where(inArray(s.leadBatches.bookingId, bookingIds));
  return deleted.length;
}

/** Tâche planifiée : leads au-delà de la durée de conservation, e-mails simulés, jetons expirés. */
export async function purgeExpiredData(db: Db, now = new Date()) {
  const pricing = await getPricing(db);
  const leadsLimit = new Date(now.getTime() - pricing.leadsRetentionDays * 86_400_000);
  const old = await db.select({ id: s.leadBatches.id, bookingId: s.leadBatches.bookingId }).from(s.leadBatches).where(lt(s.leadBatches.createdAt, leadsLimit));
  let leads = 0;
  if (old.length) {
    const ids = old.map((b) => b.id);
    const cards = await db.select().from(s.businessCards).where(inArray(s.businessCards.batchId, ids));
    for (const c of cards) await deleteFile(c.path);
    leads = (await db.delete(s.leads).where(inArray(s.leads.batchId, ids)).returning({ id: s.leads.id })).length;
    await db.delete(s.leadBatches).where(inArray(s.leadBatches.id, ids));
  }
  await db.delete(s.emailOutbox).where(lt(s.emailOutbox.createdAt, new Date(now.getTime() - 90 * 86_400_000)));
  await db.delete(s.passwordResets).where(lt(s.passwordResets.expiresAt, now));
  await db.delete(s.rateLimits).where(lt(s.rateLimits.windowStart, new Date(now.getTime() - 86_400_000)));
  return { leads };
}
