import { notFound, redirect } from "next/navigation";
import { getLang } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { getDb } from "@/db";
import { requireCompany } from "@/lib/auth/session";
import { getCompanyBooking, loadBookingContext } from "@/lib/services/booking";

/** Brouillon de l'entreprise connectée, avec son contexte (événement, postes, profils, devis). */
export async function loadDraft(id: string, step: string, allowSent = false) {
  const company = await requireCompany(`/reserver/${id}/${step}`);
  const db = await getDb();
  const booking = await getCompanyBooking(db, id, company.id);
  if (!booking) notFound();
  if (!allowSent && booking.status !== "brouillon") redirect(localizePath(`/reserver/${id}/confirmation`, await getLang()));
  const ctx = await loadBookingContext(db, booking);
  return { db, company, booking, ...ctx };
}

export type Draft = Awaited<ReturnType<typeof loadDraft>>;

/** Étapes déjà franchies (pour le stepper). */
export function reachedStep(d: Draft) {
  if (!d.event) return 1;
  if (d.positions.length === 0) return 2;
  if (!d.booking.referentId && !d.booking.referentOtherName) return 3;
  const filled = d.positions.every((p) => d.assignments.filter((a) => a.role === p.role).length >= p.qty);
  return filled ? 5 : 4;
}
