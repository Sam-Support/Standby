import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { isRoleKey, ROLES, type RoleKey } from "@/lib/domain";
import { dateRange, euros, hourly } from "@/lib/format";
import { sendEmail } from "@/lib/integrations/email";
import { manualPayments } from "@/lib/payment-mode";

/**
 * E-mails à l'équipe Stand-By (SUPPORT_EMAIL, ex. contact@stand-by.fr) à chaque étape importante, tant que les
 * paiements sont faits à la main (PAYMENT_MODE=manuel) : l'équipe y trouve de quoi établir les contrats.
 * Ces e-mails contiennent les coordonnées complètes : ils ne partent qu'à l'équipe, jamais à un client.
 * Un échec d'envoi ne bloque jamais l'action en cours.
 */
export async function mailTeam(db: Db, subject: string, lines: (string | null | undefined | false)[], link?: string) {
  const to = process.env.SUPPORT_EMAIL;
  if (!to || !manualPayments()) return;
  try {
    await sendEmail(
      {
        to,
        subject: `[Stand-By] ${subject}`,
        text: lines.filter((l): l is string => typeof l === "string").join("\n"),
        link: link ? { label: "Ouvrir dans l’administration", href: link } : undefined,
        category: "equipe",
      },
      db,
    );
  } catch (e) {
    console.error("[equipe] envoi impossible", e);
  }
}

const COMMISSION_LABEL = (b: { commissionType: string; commissionLeadCents: number; commissionSaleBps: number }) =>
  b.commissionType === "lead"
    ? `${euros(b.commissionLeadCents)} par lead qualifié`
    : b.commissionType === "vente"
      ? `${(b.commissionSaleBps / 100).toLocaleString("fr-FR")} % des ventes réalisées sur le stand`
      : "aucune";

/** Fiche complète d'une réservation pour l'équipe : entreprise, contact, salon, équipe avec coordonnées, devis. */
export async function bookingLines(db: Db, bookingId: string): Promise<string[]> {
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
  if (!b) return [];
  const [c] = await db.select().from(s.companies).where(eq(s.companies.id, b.companyId));
  const [owner] = await db.select().from(s.profiles).where(eq(s.profiles.id, c.ownerId));
  const [e] = b.eventId ? await db.select().from(s.events).where(eq(s.events.id, b.eventId)) : [];
  const [referent] = b.referentId ? await db.select().from(s.companyReferents).where(eq(s.companyReferents.id, b.referentId)) : [];
  const positions = await db.select().from(s.bookingPositions).where(eq(s.bookingPositions.bookingId, b.id));
  const team = await db
    .select({ a: s.assignments, p: s.profiles })
    .from(s.assignments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(eq(s.assignments.bookingId, b.id));
  const role = (r: string) => (isRoleKey(r) ? ROLES[r as RoleKey].short : r);
  const lines: (string | null)[] = [
    `Réservation ${b.ref} · statut : ${b.status}`,
    `Formule : ${b.offer === "prospection" ? "prospection autonome (sans stand)" : "équipe de stand"}`,
    "",
    `Entreprise : ${c.name} · SIRET ${c.siret}${c.siretVerified ? "" : " (identité à vérifier)"}`,
    c.billingAddress ? `Adresse de facturation : ${c.billingAddress}` : null,
    owner ? `Contact : ${owner.firstName} ${owner.lastName} · ${owner.email}${owner.phone ? ` · ${owner.phone}` : ""}` : null,
    referent
      ? `Référent sur place : ${referent.name}${referent.phone ? ` · ${referent.phone}` : ""}`
      : b.referentOtherName
        ? `Référent sur place : ${b.referentOtherName}${b.referentOtherPhone ? ` · ${b.referentOtherPhone}` : ""}`
        : null,
    "",
    e ? `Salon : ${e.name} · ${e.city} · ${dateRange(e.startsOn, e.endsOn)}` : "Salon : non choisi",
    `Jours : ${b.days.join(", ") || "—"} · horaires ${b.startTime} – ${b.endTime}${b.stand ? ` · stand ${b.stand}` : ""}`,
    `Postes : ${positions.map((p) => `${p.qty} × ${role(p.role)}`).join(", ") || "—"}`,
    `Commission des commerciaux : ${COMMISSION_LABEL(b)}`,
    b.prospectionTarget ? `Cibles de prospection : ${b.prospectionTarget}` : null,
    b.totalHtCents ? `Devis : ${euros(b.totalHtCents)} HT · ${euros(b.totalTtcCents ?? 0)} TTC` : null,
    "",
    "Équipe :",
    ...(team.length
      ? team.map(({ a, p }) => `- ${p.firstName} ${p.lastName} · ${role(a.role)} · ${hourly(a.hourlyRateCents)} · ${a.status} · ${p.email}${p.phone ? ` · ${p.phone}` : ""}`)
      : ["- aucun commercial sélectionné"]),
  ];
  return lines.filter((l): l is string => l !== null);
}
