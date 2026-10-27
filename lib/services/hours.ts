import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { addDays, todayIso } from "@/lib/format";
import { audit } from "@/lib/notify";
import { billableMinutesPerDay } from "@/lib/pricing";
import { finalizeBooking } from "./billing";
import { BookingError } from "./booking";

export async function declareHours(
  db: Db,
  assignmentId: string,
  freelancerUserId: string,
  entries: { day: string; minutes: number }[],
  today = todayIso(),
) {
  const [row] = await db
    .select({ a: s.assignments, f: s.freelancers, b: s.bookings })
    .from(s.assignments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(eq(s.assignments.id, assignmentId));
  if (!row || row.f.userId !== freelancerUserId || row.a.status !== "acceptee") throw new BookingError("Mission introuvable.");
  if (!["en_cours", "heures_a_valider"].includes(row.b.status)) throw new BookingError("Les heures se déclarent pendant ou après l’événement.");
  const days = new Set(row.b.days);
  const existing = await db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, assignmentId));
  for (const e of entries) {
    if (!days.has(e.day) || e.day > today) continue;
    if (!Number.isInteger(e.minutes) || e.minutes < 0 || e.minutes > 14 * 60) throw new BookingError("Heures invalides (14 h maximum par jour).");
    const cur = existing.find((t) => t.day === e.day);
    if (cur?.status === "valide") continue;
    if (cur) await db.update(s.timesheets).set({ minutesDeclared: e.minutes, status: "declare" }).where(eq(s.timesheets.id, cur.id));
    else await db.insert(s.timesheets).values({ assignmentId, day: e.day, minutesDeclared: e.minutes });
  }
}

/** L'exposant valide (ou ajuste) le total d'heures d'une personne. */
export async function validateAssignmentHours(db: Db, assignmentId: string, companyId: string, actorId: string, totalMinutes?: number) {
  const [row] = await db
    .select({ a: s.assignments, b: s.bookings })
    .from(s.assignments)
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(eq(s.assignments.id, assignmentId));
  if (!row || row.b.companyId !== companyId) throw new BookingError("Mission introuvable.");
  if (row.b.status !== "heures_a_valider") throw new BookingError("Les heures ne sont pas encore à valider.");
  let sheets = await db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, assignmentId));
  if (sheets.length === 0) {
    // rien de déclaré : on part des heures prévues à la réservation
    const planned = billableMinutesPerDay(row.b.startTime, row.b.endTime);
    sheets = await db
      .insert(s.timesheets)
      .values(row.b.days.map((day) => ({ assignmentId, day, minutesDeclared: planned })))
      .returning();
  }
  sheets.sort((x, y) => x.day.localeCompare(y.day));
  const declared = sheets.reduce((n, t) => n + t.minutesDeclared, 0);
  let delta = totalMinutes === undefined ? 0 : totalMinutes - declared;
  if (totalMinutes !== undefined && (totalMinutes < 0 || totalMinutes > sheets.length * 14 * 60)) throw new BookingError("Total d’heures invalide.");
  // l'ajustement s'applique en partant du dernier jour
  const validated = sheets.map((t) => t.minutesDeclared);
  for (let i = validated.length - 1; i >= 0 && delta !== 0; i--) {
    const next = Math.max(0, validated[i] + delta);
    delta -= next - validated[i];
    validated[i] = next;
  }
  for (const [i, t] of sheets.entries()) {
    await db.update(s.timesheets).set({ minutesValidated: validated[i], status: "valide" }).where(eq(s.timesheets.id, t.id));
  }
  await audit(db, actorId, "hours.validate", "assignment", assignmentId, { declared, validated: validated.reduce((a, b) => a + b, 0) });
  await maybeFinalize(db, row.b.id);
}

async function maybeFinalize(db: Db, bookingId: string) {
  const asg = await db
    .select()
    .from(s.assignments)
    .where(and(eq(s.assignments.bookingId, bookingId), eq(s.assignments.status, "acceptee")));
  if (asg.length === 0) return;
  const sheets = await db.select().from(s.timesheets).where(inArray(s.timesheets.assignmentId, asg.map((a) => a.id)));
  const ready = asg.every((a) => {
    const mine = sheets.filter((t) => t.assignmentId === a.id);
    return mine.length > 0 && mine.every((t) => t.status === "valide");
  });
  if (ready) await finalizeBooking(db, bookingId);
}

/** Tâche planifiée : sans réponse de l'exposant 3 jours après l'événement, les heures déclarées sont validées. */
export async function autoValidateHours(db: Db, today = todayIso()) {
  const open = await db.select().from(s.bookings).where(eq(s.bookings.status, "heures_a_valider"));
  let n = 0;
  for (const b of open) {
    const last = [...b.days].sort().at(-1);
    if (!last || addDays(last, 3) > today) continue;
    const asg = await db.select().from(s.assignments).where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "acceptee")));
    for (const a of asg) {
      const sheets = await db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, a.id));
      if (sheets.length === 0) continue; // sans déclaration : arbitrage manuel par l'équipe Standby
      for (const t of sheets.filter((x) => x.status !== "valide")) {
        await db.update(s.timesheets).set({ status: "valide", minutesValidated: t.minutesDeclared }).where(eq(s.timesheets.id, t.id));
      }
    }
    await audit(db, null, "hours.auto_validate", "booking", b.id);
    await maybeFinalize(db, b.id);
    n++;
  }
  return n;
}
