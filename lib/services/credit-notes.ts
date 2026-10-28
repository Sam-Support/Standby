import { and, count, desc, eq, gte, inArray, sum } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { eurosPrecise } from "@/lib/format";
import { refundPayment, stripeEnabled } from "@/lib/integrations/stripe";
import { audit, notify } from "@/lib/notify";
import { markPaymentSucceeded } from "./billing";
import { BookingError } from "./booking";

export type CreditNote = typeof s.creditNotes.$inferSelect;

/** Numérotation continue par année, distincte des factures : A-2026-00001. */
export async function nextCreditNoteNumber(db: Db) {
  const year = new Date().getFullYear();
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.creditNotes)
    .where(gte(s.creditNotes.issuedAt, new Date(`${year}-01-01T00:00:00Z`)));
  return `A-${year}-${String(n + 1).padStart(5, "0")}`;
}

export async function creditNotesFor(db: Db, invoiceIds: string[]) {
  if (invoiceIds.length === 0) return [];
  return db.select().from(s.creditNotes).where(inArray(s.creditNotes.invoiceId, invoiceIds)).orderBy(s.creditNotes.issuedAt);
}

/** Reste à créditer : total TTC de la facture moins les avoirs déjà émis. */
export async function creditableCents(db: Db, invoiceId: string) {
  const [inv] = await db.select({ ttc: s.invoices.totalTtcCents }).from(s.invoices).where(eq(s.invoices.id, invoiceId));
  if (!inv) return 0;
  const [done] = await db.select({ ttc: sum(s.creditNotes.totalTtcCents) }).from(s.creditNotes).where(eq(s.creditNotes.invoiceId, invoiceId));
  return inv.ttc - Number(done?.ttc ?? 0);
}

async function latestPayment(db: Db, bookingId: string) {
  const [p] = await db.select().from(s.payments).where(eq(s.payments.bookingId, bookingId)).orderBy(desc(s.payments.createdAt));
  return p ?? null;
}

/**
 * Avoir sur une facture (erreur, geste commercial, litige réglé). Facture réglée : le montant est remboursé sur le
 * moyen de paiement. Pas encore réglée : il est déduit du prélèvement. La paie des commerciaux n'est pas modifiée.
 */
export async function issueCreditNote(db: Db, adminId: string, invoiceId: string, input: { amountTtcCents: number; reason: string }) {
  const [row] = await db
    .select({ invoice: s.invoices, booking: s.bookings })
    .from(s.invoices)
    .innerJoin(s.bookings, eq(s.bookings.id, s.invoices.bookingId))
    .where(eq(s.invoices.id, invoiceId));
  if (!row) throw new BookingError("Facture introuvable.");
  const reason = input.reason.trim();
  if (reason.length < 5) throw new BookingError("Indiquez le motif de l’avoir : il figure sur le document envoyé au client.");
  const ttc = input.amountTtcCents;
  if (!Number.isInteger(ttc) || ttc <= 0) throw new BookingError("Montant invalide.");
  const remaining = await creditableCents(db, invoiceId);
  if (ttc > remaining) throw new BookingError(`Montant supérieur au reste à créditer sur cette facture (${eurosPrecise(remaining)} TTC).`);
  const payment = await latestPayment(db, row.booking.id);
  if (payment?.status === "en_cours") throw new BookingError("Prélèvement en cours de traitement : émettez l’avoir une fois le paiement abouti.");

  // même taux de TVA que la facture d'origine
  const { invoice } = row;
  const ht = invoice.totalTtcCents ? Math.round((ttc * invoice.totalHtCents) / invoice.totalTtcCents) : ttc;
  const paid = payment?.status === "reussi";
  const [note] = await db
    .insert(s.creditNotes)
    .values({
      invoiceId,
      number: await nextCreditNoteNumber(db),
      reason: reason.slice(0, 500),
      totalHtCents: ht,
      vatCents: ttc - ht,
      totalTtcCents: ttc,
      refundStatus: paid ? "en_cours" : "aucun",
      createdBy: adminId,
    })
    .returning();
  await audit(db, adminId, "credit_note.issue", "invoice", invoiceId, { number: note.number, ttc, paid });

  if (paid) {
    await refundCreditNote(db, note.id);
  } else if (payment) {
    // pas encore encaissé : on prélèvera moins ; à zéro, la réservation est soldée
    const due = Math.max(0, payment.amountCents - ttc);
    await db.update(s.payments).set({ amountCents: due }).where(eq(s.payments.id, payment.id));
    if (due === 0) await markPaymentSucceeded(db, payment.id, null);
  }

  const [company] = await db.select({ ownerId: s.companies.ownerId }).from(s.companies).where(eq(s.companies.id, row.booking.companyId));
  await notify(db, company.ownerId, {
    title: `Avoir ${note.number}`,
    body: `Avoir de ${eurosPrecise(ttc)} TTC sur la facture ${invoice.number} : ${note.reason}. ${
      paid ? "Le remboursement part sur votre moyen de paiement (comptez 5 à 10 jours ouvrés pour un prélèvement SEPA)." : "Ce montant est déduit du prélèvement à venir."
    }`,
    link: `/entreprise/avoirs/${note.id}`,
  });
  const [after] = await db.select().from(s.creditNotes).where(eq(s.creditNotes.id, note.id));
  return after;
}

const REFUND_STATUS = { succeeded: "rembourse", failed: "echoue", canceled: "echoue" } as const;

/** Remboursement de l'avoir sur le paiement Stripe (simulé sans Stripe). Peut être relancé après un échec. */
export async function refundCreditNote(db: Db, creditNoteId: string) {
  const [row] = await db
    .select({ note: s.creditNotes, booking: s.bookings })
    .from(s.creditNotes)
    .innerJoin(s.invoices, eq(s.invoices.id, s.creditNotes.invoiceId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.invoices.bookingId))
    .where(eq(s.creditNotes.id, creditNoteId));
  if (!row) throw new BookingError("Avoir introuvable.");
  const { note } = row;
  if (note.refundStatus === "rembourse" || (note.refundStatus === "en_cours" && note.stripeRefundId)) return;
  const set = (v: Partial<CreditNote>) => db.update(s.creditNotes).set(v).where(eq(s.creditNotes.id, note.id));
  if (!stripeEnabled()) {
    await set({ refundStatus: "rembourse", refundError: null });
    return;
  }
  const payment = await latestPayment(db, row.booking.id);
  if (!payment?.stripePaymentIntentId || payment.status !== "reussi") {
    await set({ refundStatus: "echoue", refundError: "Aucun paiement Stripe encaissé : remboursez par virement puis marquez l’avoir comme remboursé." });
    return;
  }
  try {
    const refund = await refundPayment({ paymentIntentId: payment.stripePaymentIntentId, amountCents: note.totalTtcCents, metadata: { creditNoteId: note.id } });
    await set({
      stripeRefundId: refund.id,
      refundStatus: REFUND_STATUS[refund.status as keyof typeof REFUND_STATUS] ?? "en_cours",
      refundError: refund.failure_reason ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await set({ refundStatus: "echoue", refundError: message });
    await audit(db, null, "refund.failed", "credit_note", note.id, { message });
  }
}

/** Retour de Stripe (webhook refund.updated / refund.failed). */
export async function applyRefundUpdate(db: Db, creditNoteId: string, status: string, failureReason?: string | null) {
  const next = REFUND_STATUS[status as keyof typeof REFUND_STATUS];
  if (!next) return;
  await db
    .update(s.creditNotes)
    .set({ refundStatus: next, refundError: next === "echoue" ? (failureReason ?? "Remboursement refusé") : null })
    .where(and(eq(s.creditNotes.id, creditNoteId), inArray(s.creditNotes.refundStatus, ["en_cours", "echoue"])));
}

/** Remboursement fait hors Stripe (virement) : l'équipe le marque comme effectué. */
export async function markRefundedManually(db: Db, adminId: string, creditNoteId: string) {
  await db.update(s.creditNotes).set({ refundStatus: "rembourse", refundError: null }).where(eq(s.creditNotes.id, creditNoteId));
  await audit(db, adminId, "refund.manual", "credit_note", creditNoteId);
}

export async function assertCreditNoteAccess(db: Db, creditNoteId: string, companyId: string | null) {
  if (!/^[0-9a-f-]{36}$/.test(creditNoteId)) throw new BookingError("Avoir introuvable.");
  const [row] = await db
    .select({ note: s.creditNotes, invoice: s.invoices, booking: s.bookings })
    .from(s.creditNotes)
    .innerJoin(s.invoices, eq(s.invoices.id, s.creditNotes.invoiceId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.invoices.bookingId))
    .where(eq(s.creditNotes.id, creditNoteId));
  if (!row || (companyId && row.booking.companyId !== companyId)) throw new BookingError("Avoir introuvable.");
  return row;
}

export const REFUND_LABELS: Record<CreditNote["refundStatus"], { label: string; tone: "" | "ok" | "warn" | "info" }> = {
  aucun: { label: "déduit du prélèvement", tone: "info" },
  en_cours: { label: "remboursement en cours", tone: "info" },
  rembourse: { label: "remboursé", tone: "ok" },
  echoue: { label: "remboursement en échec", tone: "warn" },
};
