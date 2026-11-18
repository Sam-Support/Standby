import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { audit, notify } from "@/lib/notify";
import { BookingError } from "./booking";

/**
 * Déblocage des coordonnées d'une réservation par l'équipe Stand-By (contrat signé, paiement reçu).
 * Avant : l'entreprise ne voit que « Camille D. » et aucun téléphone ; le commercial ne voit pas le téléphone du
 * référent. Après : chacun reçoit les coordonnées de l'autre (notification et e-mail) et les voit dans son espace.
 */
export async function authorizeContact(db: Db, adminId: string, bookingId: string) {
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
  if (!b) throw new BookingError("Réservation introuvable.");
  if (["brouillon", "annulee"].includes(b.status)) throw new BookingError("Réservation non confirmée ou annulée : rien à débloquer.");
  if (b.contactAuthorizedAt) return { already: true };

  await db.update(s.bookings).set({ contactAuthorizedAt: new Date(), contactAuthorizedBy: adminId }).where(eq(s.bookings.id, b.id));
  await audit(db, adminId, "booking.contact_authorized", "booking", b.id);

  const [c] = await db.select().from(s.companies).where(eq(s.companies.id, b.companyId));
  const [e] = b.eventId ? await db.select().from(s.events).where(eq(s.events.id, b.eventId)) : [];
  const [referent] = b.referentId ? await db.select().from(s.companyReferents).where(eq(s.companyReferents.id, b.referentId)) : [];
  const team = await db
    .select({ a: s.assignments, p: s.profiles })
    .from(s.assignments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "acceptee")));

  const contacts = team.map(({ p }) => `${p.firstName} ${p.lastName} (${[p.phone, p.email].filter(Boolean).join(", ")})`).join(" ; ");
  await notify(db, c.ownerId, { t: (n) => n.contactAuthorizedCompany({ ref: b.ref, team: contacts }), link: `/entreprise/reservations/${b.id}` });

  const referentName = referent?.name ?? b.referentOtherName ?? c.name;
  const referentPhone = referent?.phone ?? b.referentOtherPhone ?? null;
  for (const { a, p } of team) {
    await notify(db, p.id, {
      t: (n) => n.contactAuthorizedFreelancer({ ref: b.ref, event: e?.name ?? null, company: c.name, referent: referentName, phone: referentPhone }),
      link: `/commercial/missions/${a.id}`,
    });
  }
  return { already: false };
}
