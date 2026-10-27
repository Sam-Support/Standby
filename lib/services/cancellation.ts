import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { cancellationRate } from "@/lib/cancellation";
import { daysUntil, eurosPrecise, todayIso } from "@/lib/format";
import { audit, notify } from "@/lib/notify";
import { billableMinutesPerDay } from "@/lib/pricing";
import { getPricing } from "@/lib/settings";
import { chargeBooking, nextInvoiceNumber, type CancellationRecord } from "./billing";
import { BookingError, loadAssignments, type Booking } from "./booking";

export const CANCELLABLE = ["brouillon", "envoyee", "partielle", "confirmee", "en_cours"];

/**
 * Frais d'annulation selon le barème en vigueur à la confirmation.
 * Ils portent sur les commerciaux ayant accepté (heures prévues × taux), frais de service et TVA en sus ;
 * chaque commercial concerné reçoit la même proportion de sa rémunération prévue.
 */
export async function cancellationTerms(db: Db, b: Booking, today = todayIso()): Promise<CancellationRecord> {
  const first = [...b.days].sort()[0];
  const daysBefore = first ? daysUntil(first, today) : 999;
  const pricing = await getPricing(db, b.confirmedAt ?? new Date());
  const { bps, label } = b.status === "brouillon" ? { bps: 0, label: "réservation non envoyée" } : cancellationRate(daysBefore, pricing.cancellation);
  const minutes = b.days.length * billableMinutesPerDay(b.startTime, b.endTime);
  const surcharge = b.outfit === "standby" ? pricing.outfitStandbyCents : 0;
  const accepted = (await loadAssignments(db, b.id)).filter((a) => a.status === "acceptee");
  const share = (cents: number) => Math.round((cents * bps) / 10000);
  const subtotalCents = accepted.reduce((n, a) => n + share(((a.hourlyRateCents + surcharge) * minutes) / 60), 0);
  const serviceFeeCents = Math.round((subtotalCents * pricing.serviceFeeBps) / 10000);
  const totalHtCents = subtotalCents + serviceFeeCents;
  const vatCents = Math.round((totalHtCents * pricing.vatBps) / 10000);
  return {
    bps,
    label,
    daysBefore,
    waived: false,
    subtotalCents,
    serviceFeeCents,
    totalHtCents,
    vatCents,
    totalTtcCents: totalHtCents + vatCents,
    compensations: accepted
      .map((a) => ({ assignmentId: a.id, freelancerId: a.freelancerId, amountCents: share((a.hourlyRateCents * minutes) / 60) }))
      .filter((c) => c.amountCents > 0),
  };
}

export async function cancelBooking(db: Db, b: Booking, actorId: string, opts: { waive?: boolean; today?: string } = {}) {
  if (!CANCELLABLE.includes(b.status)) {
    throw new BookingError("Cette réservation ne peut plus être annulée en ligne : contactez-nous.");
  }
  const terms = await cancellationTerms(db, b, opts.today);
  const record: CancellationRecord = opts.waive
    ? { ...terms, waived: true, subtotalCents: 0, serviceFeeCents: 0, totalHtCents: 0, vatCents: 0, totalTtcCents: 0, compensations: [] }
    : terms;
  const asg = await loadAssignments(db, b.id);
  await db.update(s.bookings).set({ status: "annulee", cancelledAt: new Date(), cancellation: record }).where(eq(s.bookings.id, b.id));
  await db.update(s.assignments).set({ status: "annulee" }).where(eq(s.assignments.bookingId, b.id));

  if (b.status !== "brouillon") {
    for (const a of asg.filter((x) => x.status === "proposee" || x.status === "acceptee")) {
      const comp = record.compensations.find((c) => c.assignmentId === a.id);
      await notify(db, a.userId, {
        title: `Mission annulée (${b.ref})`,
        body: comp
          ? `L’exposant a annulé cette réservation. Une indemnité de ${eurosPrecise(comp.amountCents)} vous sera versée après encaissement.`
          : "L’exposant a annulé cette réservation.",
        link: "/commercial",
      });
    }
  }

  if (record.totalHtCents > 0) {
    const [invoice] = await db
      .insert(s.invoices)
      .values({
        bookingId: b.id,
        number: await nextInvoiceNumber(db),
        lines: [
          {
            label: `Frais d’annulation (${record.bps / 100} %)`,
            detail: `${record.compensations.length} personne(s) engagée(s) · annulation ${record.label}`,
            totalCents: record.subtotalCents,
          },
          { label: "Frais de service", detail: "", totalCents: record.serviceFeeCents },
        ],
        subtotalCents: record.subtotalCents,
        serviceFeeCents: record.serviceFeeCents,
        totalHtCents: record.totalHtCents,
        vatCents: record.vatCents,
        totalTtcCents: record.totalTtcCents,
      })
      .returning();
    const [company] = await db.select().from(s.companies).where(eq(s.companies.id, b.companyId));
    await notify(db, company.ownerId, {
      title: `Facture d’annulation ${invoice.number}`,
      body: `Réservation ${b.ref} annulée ${record.label} : frais de ${eurosPrecise(record.totalTtcCents)} TTC (${record.bps / 100} %).`,
      link: `/entreprise/factures/${invoice.id}`,
    });
    const [payment] = await db.insert(s.payments).values({ bookingId: b.id, amountCents: record.totalTtcCents }).returning();
    await chargeBooking(db, payment.id);
  }
  await audit(db, actorId, "booking.cancel", "booking", b.id, { bps: record.bps, waived: record.waived, totalHtCents: record.totalHtCents });
  return record;
}
