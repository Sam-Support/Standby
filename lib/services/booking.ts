import { randomInt } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { isRoleKey, ROLES, type RoleKey } from "@/lib/domain";
import { listDays, todayIso } from "@/lib/format";
import { daysOverlap, matchScore } from "@/lib/matching";
import { audit, notify } from "@/lib/notify";
import { billableMinutesPerDay, computeQuote, type Quote } from "@/lib/pricing";
import { getPricing, type Pricing } from "@/lib/settings";

export class BookingError extends Error {}

export type Booking = typeof s.bookings.$inferSelect;
export type EventRow = typeof s.events.$inferSelect;

const ACTIVE_ASSIGNMENT = ["selectionne", "proposee", "acceptee"] as const;
const BUSY_ASSIGNMENT = ["proposee", "acceptee"] as const;

export function newRef() {
  const n = () => String(randomInt(0, 10000)).padStart(4, "0");
  return `SB-${n()}-${n()}`;
}

/** Jours sélectionnables pour un événement : ouverture + montage éventuel la veille. */
export function eventDays(e: EventRow): string[] {
  return [...(e.setupOn ? [e.setupOn] : []), ...listDays(e.startsOn, e.endsOn)];
}

export async function createDraft(db: Db, companyId: string, eventSlug?: string | null): Promise<Booking> {
  let eventId: string | null = null;
  let days: string[] = [];
  if (eventSlug) {
    const [e] = await db.select().from(s.events).where(and(eq(s.events.slug, eventSlug), eq(s.events.published, true)));
    if (e) {
      eventId = e.id;
      days = listDays(e.startsOn, e.endsOn);
    }
  }
  const [template] = await db
    .select({ id: s.leadTemplates.id })
    .from(s.leadTemplates)
    .where(or(eq(s.leadTemplates.companyId, companyId), isNull(s.leadTemplates.companyId)))
    .orderBy(sql`${s.leadTemplates.companyId} is null`);
  const [b] = await db
    .insert(s.bookings)
    .values({ ref: newRef(), companyId, eventId, days, leadTemplateId: template?.id, languages: ["Français"] })
    .returning();
  return b;
}

export async function getCompanyBooking(db: Db, bookingId: string, companyId: string): Promise<Booking | null> {
  if (!/^[0-9a-f-]{36}$/.test(bookingId)) return null;
  const [b] = await db.select().from(s.bookings).where(and(eq(s.bookings.id, bookingId), eq(s.bookings.companyId, companyId)));
  return b ?? null;
}

export type AssignmentView = Awaited<ReturnType<typeof loadAssignments>>[number];

export async function loadAssignments(db: Db, bookingId: string) {
  return db
    .select({
      id: s.assignments.id,
      role: s.assignments.role,
      status: s.assignments.status,
      hourlyRateCents: s.assignments.hourlyRateCents,
      matchScore: s.assignments.matchScore,
      freelancerId: s.freelancers.id,
      userId: s.freelancers.userId,
      firstName: s.profiles.firstName,
      lastName: s.profiles.lastName,
      phone: s.profiles.phone,
      city: s.freelancers.city,
      ratingX10: s.freelancers.ratingX10,
      missionsCount: s.freelancers.missionsCount,
      specialties: s.freelancers.specialties,
      languages: s.freelancers.languages,
      topSize: s.freelancers.topSize,
      pantsSize: s.freelancers.pantsSize,
      shoeSize: s.freelancers.shoeSize,
      avatarColor: s.freelancers.avatarColor,
      stripeAccountId: s.freelancers.stripeAccountId,
    })
    .from(s.assignments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(eq(s.assignments.bookingId, bookingId))
    .orderBy(s.assignments.createdAt);
}

export async function loadBookingContext(db: Db, booking: Booking) {
  const [event] = booking.eventId ? await db.select().from(s.events).where(eq(s.events.id, booking.eventId)) : [];
  const positions = await db.select().from(s.bookingPositions).where(eq(s.bookingPositions.bookingId, booking.id));
  const assignments = await loadAssignments(db, booking.id);
  const [referent] = booking.referentId ? await db.select().from(s.companyReferents).where(eq(s.companyReferents.id, booking.referentId)) : [];
  const [template] = booking.leadTemplateId ? await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.id, booking.leadTemplateId)) : [];
  const pricing = await getPricing(db);
  const quote = quoteFor(booking, positions, assignments, pricing);
  return { event: event ?? null, positions, assignments, referent: referent ?? null, template: template ?? null, pricing, ...quote };
}

/** Devis : taux des profils retenus, tarif plancher pour les places encore vides (estimation). */
export function quoteFor(
  booking: Booking,
  positions: { role: string; qty: number }[],
  assignments: { role: string; status: string; hourlyRateCents: number }[],
  pricing: Pricing,
): { quote: Quote; estimated: boolean } {
  let estimated = false;
  const quotePositions = positions
    .filter((p) => isRoleKey(p.role) && p.qty > 0)
    .map((p) => {
      const role = p.role as RoleKey;
      const rates = assignments
        .filter((a) => a.role === role && (ACTIVE_ASSIGNMENT as readonly string[]).includes(a.status))
        .map((a) => a.hourlyRateCents)
        .slice(0, p.qty);
      while (rates.length < p.qty) {
        rates.push(pricing.floors[role]);
        estimated = true;
      }
      return { role, rates };
    });
  const quote = computeQuote({
    positions: quotePositions,
    days: booking.days.length,
    billableMinutesPerDay: billableMinutesPerDay(booking.startTime, booking.endTime),
    serviceFeeBps: pricing.serviceFeeBps,
    vatBps: pricing.vatBps,
    surchargeCents: booking.outfit === "standby" ? pricing.outfitStandbyCents : 0,
  });
  return { quote, estimated };
}

function assertDraft(b: Booking) {
  if (b.status !== "brouillon") throw new BookingError("Cette réservation est déjà envoyée : elle ne peut plus être modifiée ici.");
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveEventStep(
  db: Db,
  b: Booking,
  input: { eventId: string; days: string[]; startTime: string; endTime: string; stand: string },
) {
  assertDraft(b);
  const [e] = await db.select().from(s.events).where(and(eq(s.events.id, input.eventId), eq(s.events.published, true)));
  if (!e) throw new BookingError("Choisissez un événement.");
  const allowed = new Set(eventDays(e));
  const days = [...new Set(input.days)].filter((d) => allowed.has(d)).sort();
  if (days.length === 0) throw new BookingError("Choisissez au moins un jour.");
  if (!TIME.test(input.startTime) || !TIME.test(input.endTime) || billableMinutesPerDay(input.startTime, input.endTime) <= 0) {
    throw new BookingError("Vérifiez les horaires de service.");
  }
  if (e.id !== b.eventId || days.join() !== b.days.join()) {
    // les disponibilités changent : on relance la sélection
    await db.delete(s.assignments).where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "selectionne")));
  }
  await db
    .update(s.bookings)
    .set({ eventId: e.id, days, startTime: input.startTime, endTime: input.endTime, stand: input.stand.trim().slice(0, 40) || null })
    .where(eq(s.bookings.id, b.id));
}

export async function saveTeamStep(
  db: Db,
  b: Booking,
  input: { positions: Partial<Record<RoleKey, number>>; languages: string[]; outfit: "exposant" | "perso" | "standby" },
) {
  assertDraft(b);
  const entries = Object.entries(input.positions).filter(([role, qty]) => isRoleKey(role) && (qty ?? 0) > 0) as [RoleKey, number][];
  if (entries.length === 0) throw new BookingError("Ajoutez au moins une personne sur le stand.");
  if (entries.some(([, q]) => q > 20)) throw new BookingError("20 personnes maximum par poste.");
  const languages = [...new Set(input.languages.map((l) => l.trim()).filter(Boolean))].slice(0, 10);
  if (languages.length === 0) throw new BookingError("Choisissez au moins une langue.");

  await db.delete(s.bookingPositions).where(eq(s.bookingPositions.bookingId, b.id));
  await db.insert(s.bookingPositions).values(entries.map(([role, qty]) => ({ bookingId: b.id, role, qty })));
  // retire les profils en trop
  const selected = await db
    .select()
    .from(s.assignments)
    .where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "selectionne")))
    .orderBy(sql`${s.assignments.matchScore} desc`);
  const keep = new Map<string, number>();
  const toDelete: string[] = [];
  for (const a of selected) {
    const max = input.positions[a.role as RoleKey] ?? 0;
    const n = keep.get(a.role) ?? 0;
    if (n >= max) toDelete.push(a.id);
    else keep.set(a.role, n + 1);
  }
  if (toDelete.length) await db.delete(s.assignments).where(inArray(s.assignments.id, toDelete));
  await db.update(s.bookings).set({ languages, outfit: input.outfit }).where(eq(s.bookings.id, b.id));
}

export async function saveBriefStep(
  db: Db,
  b: Booking,
  input: {
    referentId: string | null;
    otherName?: string;
    otherPhone?: string;
    highlights: string;
    brief: string;
    leadTemplateId: string | null;
    leadFrequency: "quotidien" | "fin";
    brochure?: { path: string; name: string } | null;
  },
) {
  assertDraft(b);
  let referentId: string | null = null;
  if (input.referentId) {
    const [r] = await db
      .select()
      .from(s.companyReferents)
      .where(and(eq(s.companyReferents.id, input.referentId), eq(s.companyReferents.companyId, b.companyId)));
    if (!r) throw new BookingError("Référent inconnu.");
    referentId = r.id;
  } else if (!input.otherName?.trim() || !input.otherPhone?.trim()) {
    throw new BookingError("Indiquez le nom et le téléphone du référent sur place.");
  }
  let leadTemplateId = b.leadTemplateId;
  if (input.leadTemplateId) {
    const [t] = await db
      .select()
      .from(s.leadTemplates)
      .where(and(eq(s.leadTemplates.id, input.leadTemplateId), or(eq(s.leadTemplates.companyId, b.companyId), isNull(s.leadTemplates.companyId))));
    if (!t) throw new BookingError("Format de leads inconnu.");
    leadTemplateId = t.id;
  }
  await db
    .update(s.bookings)
    .set({
      referentId,
      referentOtherName: referentId ? null : input.otherName!.trim(),
      referentOtherPhone: referentId ? null : input.otherPhone!.trim(),
      highlights: input.highlights.trim().slice(0, 2000) || null,
      brief: input.brief.trim().slice(0, 5000) || null,
      leadTemplateId,
      leadFrequency: input.leadFrequency,
      ...(input.brochure ? { brochurePath: input.brochure.path, brochureName: input.brochure.name } : {}),
    })
    .where(eq(s.bookings.id, b.id));
}

export type Candidate = Awaited<ReturnType<typeof findCandidates>>[number];

/** Profils disponibles pour un poste, classés par score de compatibilité. */
export async function findCandidates(db: Db, b: Booking, role: RoleKey, excludeFreelancerIds: string[] = []) {
  const [event] = b.eventId ? await db.select().from(s.events).where(eq(s.events.id, b.eventId)) : [];
  const rows = await db
    .select({
      id: s.freelancers.id,
      userId: s.freelancers.userId,
      firstName: s.profiles.firstName,
      lastName: s.profiles.lastName,
      city: s.freelancers.city,
      roles: s.freelancers.roles,
      languages: s.freelancers.languages,
      specialties: s.freelancers.specialties,
      hourlyRateCents: s.freelancers.hourlyRateCents,
      ratingX10: s.freelancers.ratingX10,
      missionsCount: s.freelancers.missionsCount,
      acceptRateBps: s.freelancers.acceptRateBps,
      topSize: s.freelancers.topSize,
      pantsSize: s.freelancers.pantsSize,
      shoeSize: s.freelancers.shoeSize,
      avatarColor: s.freelancers.avatarColor,
    })
    .from(s.freelancers)
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(
      and(
        eq(s.freelancers.status, "valide"),
        isNull(s.freelancers.blockedReason), // attestation URSSAF expirée, établissement fermé…
        isNotNull(s.profiles.emailVerifiedAt),
        sql`${s.freelancers.roles} @> array[${role}]::text[]`,
      ),
    );

  // indisponibles : déjà engagés sur un autre événement aux mêmes dates
  const busy = await db
    .select({ freelancerId: s.assignments.freelancerId, days: s.bookings.days })
    .from(s.assignments)
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(and(inArray(s.assignments.status, [...BUSY_ASSIGNMENT]), sql`${s.bookings.id} <> ${b.id}`, sql`${s.bookings.status} <> 'annulee'`));
  const busyIds = new Set(busy.filter((x) => daysOverlap(x.days, b.days)).map((x) => x.freelancerId));
  const favs = new Set(
    (await db.select({ id: s.favorites.freelancerId }).from(s.favorites).where(eq(s.favorites.companyId, b.companyId))).map((f) => f.id),
  );
  const excluded = new Set(excludeFreelancerIds);
  return rows
    .filter((r) => !busyIds.has(r.id) && !excluded.has(r.id))
    .map((r) => {
      const { score } = matchScore(
        { ...r, isFavorite: favs.has(r.id) },
        { languages: b.languages, specialty: event?.specialty ?? null, city: event?.city ?? "" },
      );
      return { ...r, score, isFavorite: favs.has(r.id) };
    })
    .sort((a, b2) => b2.score - a.score || b2.ratingX10 - a.ratingX10);
}

/** Complète chaque poste avec les meilleurs profils (« Re-sélection auto »). */
export async function autoSelect(db: Db, b: Booking, reset = false) {
  assertDraft(b);
  if (reset) await db.delete(s.assignments).where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "selectionne")));
  const positions = await db.select().from(s.bookingPositions).where(eq(s.bookingPositions.bookingId, b.id));
  for (const p of positions) {
    if (!isRoleKey(p.role)) continue;
    const current = await db.select().from(s.assignments).where(eq(s.assignments.bookingId, b.id));
    const already = current.filter((a) => a.role === p.role).length;
    if (already >= p.qty) continue;
    const candidates = await findCandidates(db, b, p.role, current.map((a) => a.freelancerId));
    const picks = candidates.slice(0, p.qty - already);
    if (picks.length) {
      await db.insert(s.assignments).values(
        picks.map((c) => ({ bookingId: b.id, freelancerId: c.id, role: p.role, hourlyRateCents: c.hourlyRateCents, matchScore: c.score })),
      );
    }
  }
}

export async function toggleSelection(db: Db, b: Booking, freelancerId: string, role: RoleKey) {
  assertDraft(b);
  const existing = await db.select().from(s.assignments).where(eq(s.assignments.bookingId, b.id));
  const mine = existing.find((a) => a.freelancerId === freelancerId);
  if (mine) {
    await db.delete(s.assignments).where(eq(s.assignments.id, mine.id));
    return;
  }
  const [pos] = await db.select().from(s.bookingPositions).where(and(eq(s.bookingPositions.bookingId, b.id), eq(s.bookingPositions.role, role)));
  if (!pos) throw new BookingError("Ce poste n’est pas demandé.");
  if (existing.filter((a) => a.role === role).length >= pos.qty) {
    throw new BookingError(`Les ${pos.qty} places « ${ROLES[role].short} » sont prises : retirez d’abord un profil.`);
  }
  const c = (await findCandidates(db, b, role)).find((x) => x.id === freelancerId);
  if (!c) throw new BookingError("Ce profil n’est plus disponible sur vos dates.");
  await db.insert(s.assignments).values({ bookingId: b.id, freelancerId, role, hourlyRateCents: c.hourlyRateCents, matchScore: c.score });
}

export async function toggleFavorite(db: Db, companyId: string, freelancerId: string) {
  const [fav] = await db
    .select()
    .from(s.favorites)
    .where(and(eq(s.favorites.companyId, companyId), eq(s.favorites.freelancerId, freelancerId)));
  if (fav) await db.delete(s.favorites).where(and(eq(s.favorites.companyId, companyId), eq(s.favorites.freelancerId, freelancerId)));
  else await db.insert(s.favorites).values({ companyId, freelancerId });
}

/** Problèmes bloquants avant confirmation (liste vide = prêt). */
export async function confirmationIssues(db: Db, b: Booking): Promise<string[]> {
  const issues: string[] = [];
  if (!b.eventId || b.days.length === 0) issues.push("Choisissez l’événement et les jours.");
  const positions = await db.select().from(s.bookingPositions).where(eq(s.bookingPositions.bookingId, b.id));
  if (positions.length === 0) issues.push("Composez l’équipe.");
  if (!b.referentId && !b.referentOtherName) issues.push("Indiquez le référent sur place dans le brief.");
  const selected = await db.select().from(s.assignments).where(eq(s.assignments.bookingId, b.id));
  for (const p of positions) {
    const n = selected.filter((a) => a.role === p.role).length;
    if (n < p.qty && isRoleKey(p.role)) issues.push(`Sélectionnez ${p.qty - n} profil(s) « ${ROLES[p.role].short} ».`);
  }
  return issues;
}

export async function confirmBooking(db: Db, b: Booking, actorId: string) {
  assertDraft(b);
  const issues = await confirmationIssues(db, b);
  if (issues.length) throw new BookingError(issues.join(" "));
  const ctx = await loadBookingContext(db, b);
  const now = new Date();
  await db
    .update(s.bookings)
    .set({
      status: "envoyee",
      quote: ctx.quote,
      totalHtCents: ctx.quote.totalHtCents,
      totalTtcCents: ctx.quote.totalTtcCents,
      cgvAcceptedAt: now,
      confirmedAt: now,
    })
    .where(eq(s.bookings.id, b.id));
  await db
    .update(s.assignments)
    .set({ status: "proposee", proposedAt: now })
    .where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "selectionne")));
  for (const a of ctx.assignments) {
    await notify(db, a.userId, {
      title: `Nouvelle mission : ${ctx.event?.name ?? "salon"}`,
      body: `${ROLES[a.role as RoleKey]?.label ?? a.role} · ${b.days.length} jour(s) · ${a.hourlyRateCents / 100} €/h. Acceptez ou refusez la mission depuis votre espace.`,
      link: `/commercial/missions/${a.id}`,
    });
  }
  await audit(db, actorId, "booking.confirm", "booking", b.id, { totalHtCents: ctx.quote.totalHtCents });
}

async function refreshBookingStatus(db: Db, bookingId: string) {
  const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
  if (!b || !["envoyee", "partielle", "confirmee"].includes(b.status)) return b;
  const positions = await db.select().from(s.bookingPositions).where(eq(s.bookingPositions.bookingId, bookingId));
  const total = positions.reduce((n, p) => n + p.qty, 0);
  const asg = await db.select().from(s.assignments).where(eq(s.assignments.bookingId, bookingId));
  const accepted = asg.filter((a) => a.status === "acceptee").length;
  const status = accepted >= total ? "confirmee" : accepted > 0 ? "partielle" : "envoyee";
  if (status !== b.status) await db.update(s.bookings).set({ status }).where(eq(s.bookings.id, bookingId));
  return { ...b, status };
}

async function companyOwner(db: Db, companyId: string) {
  const [c] = await db.select({ ownerId: s.companies.ownerId, name: s.companies.name }).from(s.companies).where(eq(s.companies.id, companyId));
  return c;
}

export async function respondToMission(db: Db, assignmentId: string, freelancerUserId: string, accept: boolean) {
  const [row] = await db
    .select({ a: s.assignments, f: s.freelancers, b: s.bookings })
    .from(s.assignments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.assignments.freelancerId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(eq(s.assignments.id, assignmentId));
  if (!row || row.f.userId !== freelancerUserId) throw new BookingError("Mission introuvable.");
  if (row.a.status !== "proposee") throw new BookingError("Cette mission n’attend plus de réponse.");
  await db
    .update(s.assignments)
    .set({ status: accept ? "acceptee" : "refusee", respondedAt: new Date() })
    .where(eq(s.assignments.id, assignmentId));
  await updateAcceptRate(db, row.f.id);
  const owner = await companyOwner(db, row.b.companyId);
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, freelancerUserId));
  const updated = await refreshBookingStatus(db, row.b.id);
  if (accept) {
    await notify(db, owner.ownerId, {
      title: updated?.status === "confirmee" ? `Réservation ${row.b.ref} confirmée` : `${p.firstName} a accepté la mission`,
      body:
        updated?.status === "confirmee"
          ? "Toute l’équipe a accepté. Rendez-vous au briefing J-2."
          : `${p.firstName} ${p.lastName} rejoint votre équipe (réf. ${row.b.ref}).`,
      link: `/entreprise/reservations/${row.b.id}`,
    });
  } else {
    const replacement = await proposeReplacement(db, row.b, row.a.role as RoleKey);
    await notify(db, owner.ownerId, {
      title: `Mission refusée sur ${row.b.ref}`,
      body: replacement
        ? `${p.firstName} n’est pas disponible. Un remplaçant noté ${replacement.score} % compatible a reçu la mission.`
        : `${p.firstName} n’est pas disponible et aucun remplaçant n’est libre pour l’instant : l’équipe Standby vous recontacte.`,
      link: `/entreprise/reservations/${row.b.id}`,
    });
  }
}

async function updateAcceptRate(db: Db, freelancerId: string) {
  const rows = await db
    .select({ status: s.assignments.status })
    .from(s.assignments)
    .where(and(eq(s.assignments.freelancerId, freelancerId), inArray(s.assignments.status, ["acceptee", "refusee", "expiree"])));
  if (rows.length === 0) return;
  const ok = rows.filter((r) => r.status === "acceptee").length;
  await db.update(s.freelancers).set({ acceptRateBps: Math.round((ok / rows.length) * 10000) }).where(eq(s.freelancers.id, freelancerId));
}

export async function proposeReplacement(db: Db, b: Booking, role: RoleKey) {
  const all = await db.select({ id: s.assignments.freelancerId }).from(s.assignments).where(eq(s.assignments.bookingId, b.id));
  const [best] = await findCandidates(db, b, role, all.map((a) => a.id));
  if (!best) return null;
  const [a] = await db
    .insert(s.assignments)
    .values({ bookingId: b.id, freelancerId: best.id, role, hourlyRateCents: best.hourlyRateCents, matchScore: best.score, status: "proposee", proposedAt: new Date() })
    .returning();
  await notify(db, best.userId, {
    title: "Nouvelle mission proposée",
    body: `${ROLES[role].label} · ${b.days.length} jour(s). Répondez sous 48 h depuis votre espace.`,
    link: `/commercial/missions/${a.id}`,
  });
  return best;
}

/** Tâche planifiée : démarrage, fin d'événement, expiration des propositions (48 h). */
export async function advanceBookings(db: Db, today = todayIso(), now = new Date()) {
  const open = await db.select().from(s.bookings).where(inArray(s.bookings.status, ["envoyee", "partielle", "confirmee", "en_cours"]));
  let changed = 0;
  for (const b of open) {
    const first = [...b.days].sort()[0];
    const last = [...b.days].sort().at(-1);
    if (!first || !last) continue;
    if (b.status !== "en_cours" && first <= today) {
      await db.update(s.bookings).set({ status: "en_cours" }).where(eq(s.bookings.id, b.id));
      // les missions sans réponse le jour J tombent
      await db.update(s.assignments).set({ status: "expiree" }).where(and(eq(s.assignments.bookingId, b.id), eq(s.assignments.status, "proposee")));
      changed++;
    }
    if (last < today && (b.status === "en_cours" || first <= today)) {
      await db.update(s.bookings).set({ status: "heures_a_valider" }).where(eq(s.bookings.id, b.id));
      const owner = await companyOwner(db, b.companyId);
      await notify(db, owner.ownerId, {
        title: `Heures à valider (${b.ref})`,
        body: "L’événement est terminé. Vérifiez et validez les heures de votre équipe : la paie part le lundi suivant.",
        link: `/entreprise/reservations/${b.id}`,
      });
      for (const a of (await loadAssignments(db, b.id)).filter((x) => x.status === "acceptee")) {
        await notify(db, a.userId, { title: "Déclarez vos heures", body: `Mission ${b.ref} terminée : déclarez vos heures.`, link: `/commercial/missions/${a.id}` });
      }
      changed++;
    }
  }
  // propositions sans réponse depuis 48 h
  const stale = await db
    .select({ a: s.assignments, b: s.bookings })
    .from(s.assignments)
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(and(eq(s.assignments.status, "proposee"), lt(s.assignments.proposedAt, new Date(now.getTime() - 48 * 3600_000))));
  for (const { a, b } of stale) {
    await db.update(s.assignments).set({ status: "expiree" }).where(eq(s.assignments.id, a.id));
    await updateAcceptRate(db, a.freelancerId);
    if (isRoleKey(a.role)) await proposeReplacement(db, b, a.role);
    changed++;
  }
  return changed;
}
