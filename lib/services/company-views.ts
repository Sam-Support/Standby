import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { billableMinutesPerDay } from "@/lib/pricing";

/** Données de l'espace entreprise : réservations, acceptations, heures et leads. */
export async function companyDashboard(db: Db, companyId: string) {
  const bookings = await db
    .select({ b: s.bookings, e: s.events })
    .from(s.bookings)
    .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .where(and(eq(s.bookings.companyId, companyId), sql`${s.bookings.status} <> 'brouillon'`))
    .orderBy(desc(s.bookings.confirmedAt))
    .limit(50);
  const ids = bookings.map((x) => x.b.id);
  const asg = ids.length
    ? await db
        .select({
          id: s.assignments.id,
          bookingId: s.assignments.bookingId,
          status: s.assignments.status,
          role: s.assignments.role,
          firstName: s.profiles.firstName,
          lastName: s.profiles.lastName,
          avatarColor: s.freelancers.avatarColor,
        })
        .from(s.assignments)
        .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
        .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
        .where(inArray(s.assignments.bookingId, ids))
    : [];
  const positions = ids.length ? await db.select().from(s.bookingPositions).where(inArray(s.bookingPositions.bookingId, ids)) : [];
  const sheets = asg.length ? await db.select().from(s.timesheets).where(inArray(s.timesheets.assignmentId, asg.map((a) => a.id))) : [];
  const leadCounts = ids.length
    ? await db
        .select({ bookingId: s.leads.bookingId, n: count() })
        .from(s.leads)
        .innerJoin(s.leadBatches, eq(s.leadBatches.id, s.leads.batchId))
        .where(and(inArray(s.leads.bookingId, ids), inArray(s.leadBatches.status, ["envoye", "pousse_crm"])))
        .groupBy(s.leads.bookingId)
    : [];
  const invoices = ids.length ? await db.select().from(s.invoices).where(inArray(s.invoices.bookingId, ids)) : [];

  const rows = bookings.map(({ b, e }) => {
    const people = positions.filter((p) => p.bookingId === b.id).reduce((n, p) => n + p.qty, 0);
    const team = asg.filter((a) => a.bookingId === b.id && ["proposee", "acceptee"].includes(a.status));
    const accepted = team.filter((a) => a.status === "acceptee");
    const waiting = team.filter((a) => a.status === "proposee");
    const hours = accepted.map((a) => {
      const mine = sheets.filter((t) => t.assignmentId === a.id);
      const declared = mine.reduce((n, t) => n + t.minutesDeclared, 0);
      const validated = mine.length > 0 && mine.every((t) => t.status === "valide");
      return {
        ...a,
        declared: mine.length ? declared : b.days.length * billableMinutesPerDay(b.startTime, b.endTime),
        retained: mine.reduce((n, t) => n + (t.minutesValidated ?? t.minutesDeclared), 0),
        hasDeclared: mine.length > 0,
        validated,
        // ajustement en attente du commercial, ou contesté (arbitrage Standby)
        pending: mine.some((t) => t.status === "conteste") ? ("conteste" as const) : mine.some((t) => t.status === "ajuste") ? ("ajuste" as const) : null,
      };
    });
    return {
      booking: b,
      event: e,
      people,
      accepted: accepted.length,
      waiting,
      hours,
      leads: leadCounts.find((l) => l.bookingId === b.id)?.n ?? 0,
      invoice: invoices.find((i) => i.bookingId === b.id) ?? null,
    };
  });
  return rows;
}
