import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { dateRange, daysUntil, todayIso } from "@/lib/format";
import { notify } from "@/lib/notify";
import { loadAssignments } from "./booking";

/**
 * Rappels automatiques (tâche planifiée) :
 * J-7 : badges exposants à demander (équipe Standby), point sur l'équipe pour l'exposant et les commerciaux.
 * J-2 : briefing visio avec le référent, coordonnées échangées.
 * Chaque rappel n'est envoyé qu'une fois ; une réservation faite tardivement reçoit les rappels en retard au premier passage.
 */
export async function sendReminders(db: Db, today = todayIso()) {
  const open = await db
    .select({ b: s.bookings, e: s.events, c: s.companies })
    .from(s.bookings)
    .innerJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .where(inArray(s.bookings.status, ["envoyee", "partielle", "confirmee"]));
  let sent = 0;
  for (const { b, e, c } of open) {
    const first = [...b.days].sort()[0];
    if (!first) continue;
    const left = daysUntil(first, today);
    if (left < 0) continue;
    // une réservation tardive reçoit aussi le J-7 : la demande de badges ne doit pas être oubliée
    const kinds = [...(left <= 7 ? ["j7"] : []), ...(left <= 2 ? ["j2"] : [])];
    for (const kind of kinds) {
      const [claimed] = await db.insert(s.bookingReminders).values({ bookingId: b.id, kind }).onConflictDoNothing().returning();
      if (!claimed) continue;
      await (kind === "j7" ? remindJ7 : remindJ2)(db, b, e, c, left);
      sent++;
    }
  }
  return sent;
}

type B = typeof s.bookings.$inferSelect;
type E = typeof s.events.$inferSelect;
type C = typeof s.companies.$inferSelect;

async function team(db: Db, bookingId: string) {
  const all = await loadAssignments(db, bookingId);
  return { accepted: all.filter((a) => a.status === "acceptee"), waiting: all.filter((a) => a.status === "proposee") };
}

async function referentOf(db: Db, b: B) {
  if (b.referentId) {
    const [r] = await db.select().from(s.companyReferents).where(eq(s.companyReferents.id, b.referentId));
    if (r) return { name: r.name, phone: r.phone };
  }
  return { name: b.referentOtherName ?? "votre référent", phone: b.referentOtherPhone };
}

async function remindJ7(db: Db, b: B, e: E, c: C, left: number) {
  const { accepted, waiting } = await team(db, b.id);
  const when = `${e.name} · ${e.city} · ${dateRange(e.startsOn, e.endsOn)}${b.stand ? ` · stand ${b.stand}` : ""}`;
  const admins = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.role, "admin"));
  for (const a of admins) {
    await notify(db, a.id, {
      title: `Badges à demander (${b.ref})`,
      body: `J-${left} : demander ${accepted.length} badge(s) exposant pour ${c.name} auprès de l’organisateur de ${when}.${waiting.length ? ` ${waiting.length} acceptation(s) encore en attente.` : ""}`,
      link: `/admin/reservations/${b.id}`,
      email: false,
    });
  }
  const sched = { event: e.name, city: e.city, startsOn: e.startsOn, endsOn: e.endsOn, stand: b.stand };
  await notify(db, c.ownerId, {
    t: (n) => n.teamIn({ ...sched, left, accepted: accepted.length, waiting: waiting.length }),
    link: `/entreprise/reservations/${b.id}`,
  });
  for (const a of accepted) {
    await notify(db, a.userId, { t: (n) => n.missionIn({ ...sched, left, startTime: b.startTime, endTime: b.endTime }), link: `/commercial/missions/${a.id}` });
  }
}

async function remindJ2(db: Db, b: B, e: E, c: C, left: number) {
  const { accepted } = await team(db, b.id);
  const ref = await referentOf(db, b);
  const contacts = accepted.map((a) => `${a.firstName} ${a.lastName}${a.phone ? ` (${a.phone})` : ""}`).join(", ");
  await notify(db, c.ownerId, { t: (n) => n.briefingCompany({ event: e.name, left, referent: ref.name, contacts }), link: `/entreprise/reservations/${b.id}` });
  for (const a of accepted) {
    await notify(db, a.userId, {
      t: (n) => n.briefingFreelancer({ event: e.name, left, referent: ref.name, phone: ref.phone ?? null, startTime: b.startTime, endTime: b.endTime, stand: b.stand }),
      link: `/commercial/missions/${a.id}`,
    });
  }
}
