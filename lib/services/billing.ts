import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { ROLES, isRoleKey, type RoleKey } from "@/lib/domain";
import { eurosPrecise, longDate, nextMonday, todayIso } from "@/lib/format";
import { chargeCustomer, stripeEnabled, transferToFreelancer } from "@/lib/integrations/stripe";
import { audit, notify } from "@/lib/notify";
import { payoutCents } from "@/lib/pricing";
import { getPricing } from "@/lib/settings";
import { BookingError, loadAssignments } from "./booking";

export type InvoiceLine = { label: string; detail: string; totalCents: number };

/** Minutes validées par mission. */
async function validatedMinutes(db: Db, assignmentIds: string[]) {
  if (assignmentIds.length === 0) return new Map<string, number>();
  const rows = await db.select().from(s.timesheets).where(inArray(s.timesheets.assignmentId, assignmentIds));
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.assignmentId, (m.get(r.assignmentId) ?? 0) + (r.minutesValidated ?? 0));
  return m;
}

/** Numérotation continue par année : F-2026-00001. */
export async function nextInvoiceNumber(db: Db) {
  const year = new Date().getFullYear();
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.invoices)
    .where(gte(s.invoices.issuedAt, new Date(`${year}-01-01T00:00:00Z`)));
  return `F-${year}-${String(n + 1).padStart(5, "0")}`;
}

/** Indemnités d'annulation enregistrées sur la réservation (voir services/cancellation). */
export type CancellationRecord = {
  bps: number;
  label: string;
  daysBefore: number;
  waived: boolean;
  subtotalCents: number;
  serviceFeeCents: number;
  totalHtCents: number;
  vatCents: number;
  totalTtcCents: number;
  compensations: { assignmentId: string; freelancerId: string; amountCents: number }[];
};

/** Heures toutes validées : facture, débit de l'exposant, puis paie. */
export async function finalizeBooking(db: Db, bookingId: string) {
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
  if (!b || b.status !== "heures_a_valider") return;
  const [existing] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id));
  if (existing) return;
  const pricing = await getPricing(db, b.confirmedAt ?? new Date());
  const surcharge = b.outfit === "standby" ? pricing.outfitStandbyCents : 0;
  const asg = (await loadAssignments(db, b.id)).filter((a) => a.status === "acceptee");
  const minutes = await validatedMinutes(db, asg.map((a) => a.id));

  const byRole = new Map<string, { qty: number; minutes: number; total: number }>();
  for (const a of asg) {
    const m = minutes.get(a.id) ?? 0;
    const cur = byRole.get(a.role) ?? { qty: 0, minutes: 0, total: 0 };
    byRole.set(a.role, { qty: cur.qty + 1, minutes: cur.minutes + m, total: cur.total + Math.round(((a.hourlyRateCents + surcharge) * m) / 60) });
  }
  const lines: InvoiceLine[] = [...byRole].map(([role, v]) => ({
    label: `${v.qty} × ${isRoleKey(role) ? ROLES[role as RoleKey].short : role}`,
    detail: `${(v.minutes / 60).toLocaleString("fr-FR")} h validées`,
    totalCents: v.total,
  }));
  const subtotalCents = lines.reduce((n, l) => n + l.totalCents, 0);
  const serviceFeeCents = Math.round((subtotalCents * pricing.serviceFeeBps) / 10000);
  const totalHtCents = subtotalCents + serviceFeeCents;
  const vatCents = Math.round((totalHtCents * pricing.vatBps) / 10000);
  const totalTtcCents = totalHtCents + vatCents;

  const [invoice] = await db
    .insert(s.invoices)
    .values({
      bookingId: b.id,
      number: await nextInvoiceNumber(db),
      lines: [...lines, { label: `Frais de service (${pricing.serviceFeeBps / 100} %)`, detail: "", totalCents: serviceFeeCents }],
      subtotalCents,
      serviceFeeCents,
      totalHtCents,
      vatCents,
      totalTtcCents,
    })
    .returning();
  await db.update(s.bookings).set({ status: "validee", totalHtCents, totalTtcCents }).where(eq(s.bookings.id, b.id));
  const [payment] = await db.insert(s.payments).values({ bookingId: b.id, amountCents: totalTtcCents }).returning();
  const [company] = await db.select().from(s.companies).where(eq(s.companies.id, b.companyId));
  await notify(db, company.ownerId, {
    title: `Facture ${invoice.number} disponible`,
    body: `Heures validées pour la réservation ${b.ref}. Montant TTC : ${eurosPrecise(totalTtcCents)}.`,
    link: `/entreprise/factures/${invoice.id}`,
  });
  await notify(db, company.ownerId, {
    title: "Notez votre équipe",
    body: `Comment s’est passée la réservation ${b.ref} ? Vos avis aident les prochains exposants et les commerciaux.`,
    link: `/entreprise/reservations/${b.id}#avis`,
    email: false,
  });
  await chargeBooking(db, payment.id);
}

export async function chargeBooking(db: Db, paymentId: string) {
  const [p] = await db.select().from(s.payments).where(eq(s.payments.id, paymentId));
  if (!p || p.status === "reussi") return;
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, p.bookingId));
  const [company] = await db.select().from(s.companies).where(eq(s.companies.id, b.companyId));
  if (!stripeEnabled()) {
    await markPaymentSucceeded(db, p.id, null);
    return;
  }
  if (!company.stripeCustomerId || !company.stripePaymentMethodId) {
    await db.update(s.payments).set({ status: "echoue", error: "Aucun moyen de paiement enregistré" }).where(eq(s.payments.id, p.id));
    await notify(db, company.ownerId, {
      title: "Moyen de paiement requis",
      body: `Enregistrez un mandat SEPA ou une carte pour régler la réservation ${b.ref}.`,
      link: `/entreprise/reservations/${b.id}`,
    });
    return;
  }
  try {
    const intent = await chargeCustomer({
      customerId: company.stripeCustomerId,
      paymentMethodId: company.stripePaymentMethodId,
      amountCents: p.amountCents,
      transferGroup: b.ref,
      metadata: { paymentId: p.id, bookingId: b.id },
    });
    await db.update(s.payments).set({ status: "en_cours", stripePaymentIntentId: intent.id, error: null }).where(eq(s.payments.id, p.id));
    if (intent.status === "succeeded") {
      const charge = typeof intent.latest_charge === "string" ? intent.latest_charge : (intent.latest_charge?.id ?? null);
      await markPaymentSucceeded(db, p.id, charge);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Paiement refusé";
    await db.update(s.payments).set({ status: "echoue", error: message }).where(eq(s.payments.id, p.id));
    await audit(db, null, "payment.failed", "payment", p.id, { message });
  }
}

export async function markPaymentFailed(db: Db, paymentId: string, error: string) {
  await db.update(s.payments).set({ status: "echoue", error }).where(eq(s.payments.id, paymentId));
}

/** Paiement encaissé : la réservation est payée, la paie des commerciaux est programmée. */
export async function markPaymentSucceeded(db: Db, paymentId: string, chargeId: string | null) {
  const [p] = await db.select().from(s.payments).where(eq(s.payments.id, paymentId));
  if (!p || p.status === "reussi") return;
  await db.update(s.payments).set({ status: "reussi", stripeChargeId: chargeId, error: null }).where(eq(s.payments.id, p.id));
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, p.bookingId));
  const all = await loadAssignments(db, b.id);
  let due: { a: (typeof all)[number]; amount: number }[];
  const cancelled = b.status === "annulee" ? (b.cancellation as CancellationRecord | null) : null;
  if (cancelled) {
    // frais d'annulation encaissés : les commerciaux qui avaient accepté reçoivent leur indemnité
    due = cancelled.compensations
      .map((c) => ({ a: all.find((x) => x.id === c.assignmentId)!, amount: c.amountCents }))
      .filter((d) => d.a);
  } else {
    await db.update(s.bookings).set({ status: "payee" }).where(eq(s.bookings.id, b.id));
    const pricing = await getPricing(db, b.confirmedAt ?? new Date());
    const asg = all.filter((a) => a.status === "acceptee");
    const minutes = await validatedMinutes(db, asg.map((a) => a.id));
    due = asg.map((a) => ({ a, amount: payoutCents(a.hourlyRateCents, minutes.get(a.id) ?? 0, pricing.freelancerCommissionBps) }));
  }
  const monday = nextMonday(todayIso());
  for (const { a, amount } of due) {
    if (amount <= 0) continue;
    const [payout] = await db
      .insert(s.payouts)
      .values({ assignmentId: a.id, freelancerId: a.freelancerId, amountCents: amount, scheduledFor: monday })
      .onConflictDoNothing()
      .returning();
    if (!payout) continue;
    if (stripeEnabled() && a.stripeAccountId) {
      try {
        const t = await transferToFreelancer({ amountCents: amount, accountId: a.stripeAccountId, transferGroup: b.ref, sourceCharge: chargeId });
        await db.update(s.payouts).set({ status: "transfere", stripeTransferId: t.id }).where(eq(s.payouts.id, payout.id));
      } catch (e) {
        await audit(db, null, "payout.failed", "payout", payout.id, { message: e instanceof Error ? e.message : String(e) });
      }
    }
    if (!cancelled) {
      await db.update(s.freelancers).set({ missionsCount: await missionCount(db, a.freelancerId) }).where(eq(s.freelancers.id, a.freelancerId));
    }
    await notify(db, a.userId, {
      title: cancelled ? "Indemnité d’annulation programmée" : "Paie programmée",
      body: `${eurosPrecise(amount)} pour la mission ${b.ref}${cancelled ? " (annulée par l’exposant)" : ""}, virement le lundi ${longDate(monday)}.`,
      link: "/commercial",
    });
  }
}

async function missionCount(db: Db, freelancerId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.payouts)
    .where(eq(s.payouts.freelancerId, freelancerId));
  const [f] = await db.select({ base: s.freelancers.missionsCount }).from(s.freelancers).where(eq(s.freelancers.id, freelancerId));
  return Math.max(f.base, n);
}

/** Tâche du lundi : virements programmés (simulés sans Stripe). */
export async function runPayouts(db: Db, today = todayIso()) {
  const due = await db
    .select({ p: s.payouts, f: s.freelancers, b: s.bookings })
    .from(s.payouts)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.payouts.freelancerId))
    .innerJoin(s.assignments, eq(s.assignments.id, s.payouts.assignmentId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(and(eq(s.payouts.status, "planifie"), lte(s.payouts.scheduledFor, today)));
  let done = 0;
  for (const { p, f, b } of due) {
    if (stripeEnabled()) {
      if (!f.stripeAccountId || !f.payoutsEnabled) continue;
      try {
        const t = await transferToFreelancer({ amountCents: p.amountCents, accountId: f.stripeAccountId, transferGroup: b.ref });
        await db.update(s.payouts).set({ status: "transfere", stripeTransferId: t.id }).where(eq(s.payouts.id, p.id));
      } catch (e) {
        await db.update(s.payouts).set({ status: "echoue" }).where(eq(s.payouts.id, p.id));
        await audit(db, null, "payout.failed", "payout", p.id, { message: e instanceof Error ? e.message : String(e) });
        continue;
      }
    } else {
      await db.update(s.payouts).set({ status: "transfere" }).where(eq(s.payouts.id, p.id));
    }
    done++;
  }
  return done;
}

export async function assertInvoiceAccess(db: Db, invoiceId: string, companyId: string | null) {
  const [row] = await db
    .select({ invoice: s.invoices, booking: s.bookings })
    .from(s.invoices)
    .innerJoin(s.bookings, eq(s.bookings.id, s.invoices.bookingId))
    .where(eq(s.invoices.id, invoiceId));
  if (!row || (companyId && row.booking.companyId !== companyId)) throw new BookingError("Facture introuvable.");
  return row;
}
