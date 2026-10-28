import { and, eq, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { addDays, hoursLabel, todayIso } from "@/lib/format";
import { audit, notify, notifyAdmins } from "@/lib/notify";
import { billableMinutesPerDay } from "@/lib/pricing";
import { finalizeBooking } from "./billing";
import { BookingError } from "./booking";

/** Délai laissé au commercial pour accepter ou contester des heures revues à la baisse. */
export const ADJUSTMENT_WINDOW_HOURS = 48;

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
    if (cur && cur.status !== "declare") continue; // validées, ajustées ou contestées : plus modifiables ici
    if (cur) await db.update(s.timesheets).set({ minutesDeclared: e.minutes }).where(eq(s.timesheets.id, cur.id));
    else await db.insert(s.timesheets).values({ assignmentId, day: e.day, minutesDeclared: e.minutes });
  }
}

async function loadMission(db: Db, assignmentId: string) {
  const [row] = await db
    .select({ a: s.assignments, f: s.freelancers, b: s.bookings })
    .from(s.assignments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(eq(s.assignments.id, assignmentId));
  return row ?? null;
}

const total = (sheets: { minutesDeclared: number; minutesValidated: number | null }[], key: "declared" | "validated") =>
  sheets.reduce((n, t) => n + (key === "declared" ? t.minutesDeclared : (t.minutesValidated ?? t.minutesDeclared)), 0);

/**
 * L'exposant valide (ou ajuste) le total d'heures d'une personne.
 * Revu à la baisse, le total attend l'accord du commercial (48 h, contestation possible) ;
 * l'arbitrage de l'équipe Standby (`final`) est définitif.
 */
export async function validateAssignmentHours(
  db: Db,
  assignmentId: string,
  companyId: string,
  actorId: string,
  totalMinutes?: number,
  opts: { note?: string; final?: boolean } = {},
) {
  const row = await loadMission(db, assignmentId);
  if (!row || row.b.companyId !== companyId) throw new BookingError("Mission introuvable.");
  if (row.b.status !== "heures_a_valider") throw new BookingError("Les heures ne sont pas encore à valider.");
  let sheets = await db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, assignmentId));
  if (!opts.final && sheets.some((t) => t.status === "ajuste" || t.status === "conteste")) {
    throw new BookingError("Ces heures attendent la réponse du commercial ou l’arbitrage de l’équipe Standby.");
  }
  if (sheets.length === 0) {
    // rien de déclaré : on part des heures prévues à la réservation
    const planned = billableMinutesPerDay(row.b.startTime, row.b.endTime);
    sheets = await db
      .insert(s.timesheets)
      .values(row.b.days.map((day) => ({ assignmentId, day, minutesDeclared: planned })))
      .returning();
  }
  sheets.sort((x, y) => x.day.localeCompare(y.day));
  const declared = total(sheets, "declared");
  let delta = totalMinutes === undefined ? 0 : totalMinutes - declared;
  if (totalMinutes !== undefined && (totalMinutes < 0 || totalMinutes > sheets.length * 14 * 60)) throw new BookingError("Total d’heures invalide.");
  // l'ajustement s'applique en partant du dernier jour
  const validated = sheets.map((t) => t.minutesDeclared);
  for (let i = validated.length - 1; i >= 0 && delta !== 0; i--) {
    const next = Math.max(0, validated[i] + delta);
    delta -= next - validated[i];
    validated[i] = next;
  }
  const retained = validated.reduce((a, b) => a + b, 0);
  const reduced = !opts.final && retained < declared;
  for (const [i, t] of sheets.entries()) {
    await db
      .update(s.timesheets)
      .set({ minutesValidated: validated[i], status: reduced ? "ajuste" : "valide" })
      .where(eq(s.timesheets.id, t.id));
  }
  if (reduced) {
    const note = opts.note?.trim().slice(0, 1000) || null;
    await db
      .update(s.assignments)
      .set({ hoursAdjustedAt: new Date(), hoursAdjustmentNote: note, hoursDisputeNote: null })
      .where(eq(s.assignments.id, assignmentId));
    await notify(db, row.f.userId, {
      title: `Heures ajustées (${row.b.ref})`,
      body: `L’exposant a retenu ${hoursLabel(retained)} au lieu de ${hoursLabel(declared)}${note ? ` : « ${note} »` : ""}. Acceptez ou contestez sous ${ADJUSTMENT_WINDOW_HOURS} h ; sans réponse, l’ajustement est retenu.`,
      link: `/commercial/missions/${assignmentId}`,
    });
  }
  await audit(db, actorId, opts.final ? "hours.arbitrate" : reduced ? "hours.adjust" : "hours.validate", "assignment", assignmentId, { declared, validated: retained });
  if (!reduced) await maybeFinalize(db, row.b.id);
  return { adjusted: reduced };
}

/** Réponse du commercial à un ajustement : accord (heures retenues) ou contestation (arbitrage par l'équipe Standby). */
export async function respondToAdjustment(db: Db, assignmentId: string, freelancerUserId: string, accept: boolean, reason = "") {
  const row = await loadMission(db, assignmentId);
  if (!row || row.f.userId !== freelancerUserId) throw new BookingError("Mission introuvable.");
  const sheets = await db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, assignmentId));
  if (!sheets.some((t) => t.status === "ajuste")) throw new BookingError("Aucun ajustement n’attend votre réponse.");
  const pending = sheets.filter((t) => t.status === "ajuste").map((t) => t.id);

  if (accept) {
    await db.update(s.timesheets).set({ status: "valide" }).where(inArray(s.timesheets.id, pending));
    await audit(db, freelancerUserId, "hours.adjustment_accept", "assignment", assignmentId);
    await maybeFinalize(db, row.b.id);
    return;
  }

  const motive = reason.trim();
  if (motive.length < 10) throw new BookingError("Expliquez ce qui ne va pas : horaires réels, pauses, consignes reçues sur place…");
  await db.update(s.timesheets).set({ status: "conteste" }).where(inArray(s.timesheets.id, pending));
  await db.update(s.assignments).set({ hoursDisputeNote: motive.slice(0, 1000) }).where(eq(s.assignments.id, assignmentId));
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, freelancerUserId));
  const [c] = await db.select({ ownerId: s.companies.ownerId }).from(s.companies).where(eq(s.companies.id, row.b.companyId));
  const figures = `${hoursLabel(total(sheets, "declared"))} déclarées, ${hoursLabel(total(sheets, "validated"))} retenues`;
  await notify(db, c.ownerId, {
    title: `${p.firstName} conteste l’ajustement de ses heures (${row.b.ref})`,
    body: `${figures}. Motif : « ${motive} ». L’équipe Standby arbitre avec vous deux ; la facture est émise après l’arbitrage.`,
    link: `/entreprise/reservations/${row.b.id}`,
  });
  await notifyAdmins(db, {
    title: `Heures contestées (${row.b.ref})`,
    body: `${p.firstName} ${p.lastName} : ${figures}. Motif de l’exposant : ${row.a.hoursAdjustmentNote ?? "non précisé"}. Motif du commercial : ${motive}`,
    link: `/admin/reservations/${row.b.id}`,
  });
  await audit(db, freelancerUserId, "hours.dispute", "assignment", assignmentId, { reason: motive });
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

/**
 * Tâche planifiée :
 * - ajustement sans réponse du commercial depuis 48 h : retenu ;
 * - sans réponse de l'exposant 3 jours après l'événement : les heures déclarées sont validées.
 * Les heures contestées attendent l'arbitrage de l'équipe Standby.
 */
export async function autoValidateHours(db: Db, today = todayIso(), now = new Date()) {
  let n = 0;
  const expired = await db
    .selectDistinct({ id: s.assignments.id, bookingId: s.assignments.bookingId })
    .from(s.assignments)
    .innerJoin(s.timesheets, eq(s.timesheets.assignmentId, s.assignments.id))
    .where(and(eq(s.timesheets.status, "ajuste"), lt(s.assignments.hoursAdjustedAt, new Date(now.getTime() - ADJUSTMENT_WINDOW_HOURS * 3600_000))));
  for (const a of expired) {
    await db.update(s.timesheets).set({ status: "valide" }).where(and(eq(s.timesheets.assignmentId, a.id), eq(s.timesheets.status, "ajuste")));
    await audit(db, null, "hours.adjustment_auto_accept", "assignment", a.id);
    await maybeFinalize(db, a.bookingId);
    n++;
  }

  const open = await db.select().from(s.bookings).where(eq(s.bookings.status, "heures_a_valider"));
  for (const b of open) {
    const last = [...b.days].sort().at(-1);
    if (!last || addDays(last, 3) > today) continue;
    const asg = await db.select().from(s.assignments).where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "acceptee")));
    let changed = false;
    for (const a of asg) {
      const sheets = await db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, a.id));
      if (sheets.length === 0) continue; // sans déclaration : arbitrage manuel par l'équipe Standby
      for (const t of sheets.filter((x) => x.status === "declare")) {
        await db.update(s.timesheets).set({ status: "valide", minutesValidated: t.minutesDeclared }).where(eq(s.timesheets.id, t.id));
        changed = true;
      }
    }
    if (!changed) continue;
    await audit(db, null, "hours.auto_validate", "booking", b.id);
    await maybeFinalize(db, b.id);
    n++;
  }
  return n;
}
