import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { audit, notify } from "@/lib/notify";
import { BookingError } from "./booking";

/** Moyenne tenue à jour de façon incrémentale (la note de départ peut venir d'un historique importé). */
export function addRating(x10: number, count: number, rating: number) {
  return { ratingX10: Math.round((x10 * count + rating * 10) / (count + 1)), ratingsCount: count + 1 };
}

export function removeRating(x10: number, count: number, rating: number) {
  if (count <= 1) return { ratingX10: 0, ratingsCount: 0 };
  return { ratingX10: Math.max(0, Math.round((x10 * count - rating * 10) / (count - 1))), ratingsCount: count - 1 };
}

/** L'exposant note un commercial de son équipe, une fois les heures validées. */
export async function submitReview(db: Db, companyId: string, assignmentId: string, rating: number, comment: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BookingError("Choisissez une note de 1 à 5.");
  const [row] = await db
    .select({ a: s.assignments, b: s.bookings, f: s.freelancers })
    .from(s.assignments)
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .where(eq(s.assignments.id, assignmentId));
  if (!row || row.b.companyId !== companyId || row.a.status !== "acceptee") throw new BookingError("Mission introuvable.");
  if (!["validee", "payee"].includes(row.b.status)) throw new BookingError("Vous pourrez noter l’équipe une fois les heures validées.");
  const [already] = await db
    .select({ id: s.reviews.id })
    .from(s.reviews)
    .where(and(eq(s.reviews.bookingId, row.b.id), eq(s.reviews.freelancerId, row.f.id)));
  if (already) throw new BookingError("Vous avez déjà noté cette personne pour cet événement.");
  await db.insert(s.reviews).values({
    bookingId: row.b.id,
    freelancerId: row.f.id,
    companyId,
    rating,
    comment: comment.trim().slice(0, 1000) || null,
  });
  await db.update(s.freelancers).set(addRating(row.f.ratingX10, row.f.ratingsCount, rating)).where(eq(s.freelancers.id, row.f.id));
  await notify(db, row.f.userId, {
    title: "Nouvel avis reçu",
    body: `Un exposant vous a attribué ${rating}/5 pour la mission ${row.b.ref}.`,
    link: "/commercial/profil#avis",
  });
}

/** Modération : suppression d'un avis par l'équipe Standby. */
export async function deleteReview(db: Db, adminId: string, reviewId: string) {
  const [r] = await db.select().from(s.reviews).where(eq(s.reviews.id, reviewId));
  if (!r) return;
  const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, r.freelancerId));
  await db.delete(s.reviews).where(eq(s.reviews.id, reviewId));
  await db.update(s.freelancers).set(removeRating(f.ratingX10, f.ratingsCount, r.rating)).where(eq(s.freelancers.id, f.id));
  await audit(db, adminId, "review.delete", "review", reviewId, { rating: r.rating, comment: r.comment });
}

export async function reviewsFor(db: Db, where: { freelancerId?: string } = {}) {
  return db
    .select({ r: s.reviews, companyName: s.companies.name, ref: s.bookings.ref, firstName: s.profiles.firstName, lastName: s.profiles.lastName })
    .from(s.reviews)
    .innerJoin(s.companies, eq(s.companies.id, s.reviews.companyId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.reviews.bookingId))
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.reviews.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(where.freelancerId ? eq(s.reviews.freelancerId, where.freelancerId) : undefined)
    .orderBy(desc(s.reviews.createdAt))
    .limit(200);
}
