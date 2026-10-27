import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { dateRange, daysUntil, timeLabel, todayIso } from "@/lib/format";
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
  await notify(db, c.ownerId, {
    title: `Votre équipe dans ${left} jours`,
    body: `${when}. ${accepted.length} personne(s) confirmée(s)${waiting.length ? `, ${waiting.length} en attente de réponse : nous relançons et proposons un remplaçant si besoin` : ""}. Les badges exposants sont demandés à l’organisateur. Pensez à préparer le briefing de J-2.`,
    link: `/entreprise/reservations/${b.id}`,
  });
  for (const a of accepted) {
    await notify(db, a.userId, {
      title: `Mission dans ${left} jours : ${e.name}`,
      body: `${when}, ${timeLabel(b.startTime)} – ${timeLabel(b.endTime)}. Relisez le brief et la plaquette avant le briefing de J-2.`,
      link: `/commercial/missions/${a.id}`,
    });
  }
}

async function remindJ2(db: Db, b: B, e: E, c: C, left: number) {
  const { accepted } = await team(db, b.id);
  const ref = await referentOf(db, b);
  const when = left === 0 ? "aujourd’hui" : left === 1 ? "demain" : `dans ${left} jours`;
  const contacts = accepted.map((a) => `${a.firstName} ${a.lastName}${a.phone ? ` (${a.phone})` : ""}`).join(", ");
  await notify(db, c.ownerId, {
    title: `Briefing de votre équipe (${e.name}, ${when})`,
    body: `Organisez le briefing visio avec ${ref.name} et l’équipe : ${contacts || "aucun commercial confirmé pour l’instant"}.`,
    link: `/entreprise/reservations/${b.id}`,
  });
  for (const a of accepted) {
    await notify(db, a.userId, {
      title: `Briefing J-2 : ${e.name} (${when})`,
      body: `Votre référent sur place : ${ref.name}${ref.phone ? `, ${ref.phone}` : ""}. Horaires : ${timeLabel(b.startTime)} – ${timeLabel(b.endTime)}${b.stand ? `, stand ${b.stand}` : ""}. Il vous contacte pour le briefing visio.`,
      link: `/commercial/missions/${a.id}`,
    });
  }
}
