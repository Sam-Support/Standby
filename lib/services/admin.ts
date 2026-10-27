import { and, count, eq, gte, inArray, sql, sum } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { PRICING_DEFAULTS } from "@/lib/domain";
import { audit } from "@/lib/notify";
import { putFile } from "@/lib/storage";

export class AdminError extends Error {}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export type EventInput = {
  name: string;
  kind: "salon" | "foire";
  city: string;
  venue?: string;
  startsOn: string;
  endsOn: string;
  setupOn?: string | null;
  sector: string;
  specialty?: string | null;
  siteUrl?: string | null;
  color?: string;
  published: boolean;
  verified: boolean;
  logoAuthorized: boolean;
};

function checkEvent(e: EventInput) {
  if (!e.name.trim() || !e.city.trim() || !e.sector.trim()) throw new AdminError("Nom, ville et secteur sont obligatoires.");
  if (!ISO.test(e.startsOn) || !ISO.test(e.endsOn) || e.endsOn < e.startsOn) throw new AdminError("Dates invalides (format AAAA-MM-JJ, fin après début).");
  if (e.setupOn && (!ISO.test(e.setupOn) || e.setupOn >= e.startsOn)) throw new AdminError("Le montage doit précéder l’ouverture.");
}

export async function saveEvent(db: Db, adminId: string, id: string | null, e: EventInput, logo?: { data: Buffer; name: string } | null) {
  checkEvent(e);
  const values = {
    name: e.name.trim(),
    kind: e.kind,
    city: e.city.trim(),
    venue: e.venue?.trim() || null,
    startsOn: e.startsOn,
    endsOn: e.endsOn,
    setupOn: e.setupOn || null,
    sector: e.sector.trim(),
    specialty: e.specialty || null,
    siteUrl: e.siteUrl?.trim() || null,
    color: /^#[0-9a-fA-F]{6}$/.test(e.color ?? "") ? e.color! : "#FFCD4A",
    published: e.published,
    verifiedOn: e.verified ? new Date().toISOString().slice(0, 10) : null,
    logoAuthorized: e.logoAuthorized,
  };
  let eventId = id;
  if (id) {
    const [cur] = await db.select().from(s.events).where(eq(s.events.id, id));
    if (!cur) throw new AdminError("Salon introuvable.");
    await db
      .update(s.events)
      .set({ ...values, verifiedOn: e.verified ? (cur.verifiedOn ?? values.verifiedOn) : null })
      .where(eq(s.events.id, id));
  } else {
    let slug = slugify(`${e.name}-${e.startsOn.slice(0, 4)}`);
    const [dup] = await db.select({ id: s.events.id }).from(s.events).where(eq(s.events.slug, slug));
    if (dup) slug = `${slug}-${Date.now().toString(36)}`;
    const [created] = await db.insert(s.events).values({ slug, ...values }).returning();
    eventId = created.id;
  }
  if (logo) {
    const key = `public/events/${eventId}-${Date.now()}.${logo.name.split(".").pop()}`;
    await putFile(key, logo.data, logo.name);
    await db.update(s.events).set({ logoPath: key }).where(eq(s.events.id, eventId!));
  }
  await audit(db, adminId, id ? "event.update" : "event.create", "event", eventId!, { name: values.name });
  return eventId!;
}

export async function removeEventLogo(db: Db, adminId: string, id: string) {
  await db.update(s.events).set({ logoPath: null }).where(eq(s.events.id, id));
  await audit(db, adminId, "event.logo_remove", "event", id);
}

/** Import CSV (séparateur ; ou ,) : nom;type;ville;debut;fin;montage;secteur;specialite;site */
export async function importEventsCsv(db: Db, adminId: string, text: string) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new AdminError("Le fichier doit contenir une ligne d’en-têtes et au moins un salon.");
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map((h) => slugify(h));
  const col = (row: string[], ...names: string[]) => {
    const i = head.findIndex((h) => names.includes(h));
    return i >= 0 ? (row[i] ?? "").trim().replace(/^"|"$/g, "") : "";
  };
  const errors: string[] = [];
  let created = 0;
  for (const [n, line] of lines.slice(1).entries()) {
    const row = line.split(sep);
    const kind = slugify(col(row, "type", "kind")) === "foire" ? "foire" : "salon";
    try {
      await saveEvent(db, adminId, null, {
        name: col(row, "nom", "name"),
        kind,
        city: col(row, "ville", "city"),
        startsOn: col(row, "debut", "date-debut", "start"),
        endsOn: col(row, "fin", "date-fin", "end"),
        setupOn: col(row, "montage", "setup") || null,
        sector: col(row, "secteur", "sector"),
        specialty: col(row, "specialite", "specialty") || null,
        siteUrl: col(row, "site", "url") || null,
        published: true,
        verified: false,
        logoAuthorized: false,
      });
      created++;
    } catch (e) {
      errors.push(`Ligne ${n + 2} : ${e instanceof Error ? e.message : "erreur"}`);
    }
  }
  return { created, errors };
}

export async function setPricing(db: Db, adminId: string, key: string, value: number, effectiveFrom: Date) {
  const def = PRICING_DEFAULTS[key];
  if (!def) throw new AdminError("Réglage inconnu.");
  if (!Number.isInteger(value) || value < 0 || (def.unit === "bps" && value > 10000)) throw new AdminError("Valeur invalide.");
  await db.insert(s.pricingSettings).values({ key, value, effectiveFrom, createdBy: adminId });
  await audit(db, adminId, "pricing.set", "pricing", key, { value, effectiveFrom });
}

export async function dashboardStats(db: Db) {
  const byStatus = await db.select({ status: s.bookings.status, n: count() }).from(s.bookings).groupBy(s.bookings.status);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [rev] = await db
    .select({ ht: sum(s.invoices.totalHtCents), fees: sum(s.invoices.serviceFeeCents), n: count() })
    .from(s.invoices)
    .where(gte(s.invoices.issuedAt, monthStart));
  const [allRev] = await db.select({ ht: sum(s.invoices.totalHtCents), fees: sum(s.invoices.serviceFeeCents) }).from(s.invoices);
  const [pendingDocs] = await db.select({ n: count() }).from(s.freelancerDocuments).where(eq(s.freelancerDocuments.status, "en_attente"));
  const [inReview] = await db.select({ n: count() }).from(s.freelancers).where(eq(s.freelancers.status, "en_revue"));
  const [validFreelancers] = await db.select({ n: count() }).from(s.freelancers).where(eq(s.freelancers.status, "valide"));
  const [companies] = await db.select({ n: count() }).from(s.companies);
  const [cards] = await db.select({ n: count() }).from(s.businessCards).where(eq(s.businessCards.status, "a_saisir"));
  const [failed] = await db.select({ n: count() }).from(s.payments).where(eq(s.payments.status, "echoue"));
  const [messages] = await db.select({ n: count() }).from(s.contactMessages).where(eq(s.contactMessages.handled, false));
  const [pendingPayouts] = await db
    .select({ n: count(), amount: sum(s.payouts.amountCents) })
    .from(s.payouts)
    .where(eq(s.payouts.status, "planifie"));
  const [upcoming] = await db
    .select({ n: count() })
    .from(s.events)
    .where(and(eq(s.events.published, true), gte(s.events.endsOn, new Date().toISOString().slice(0, 10))));
  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>,
    monthHt: Number(rev?.ht ?? 0),
    monthFees: Number(rev?.fees ?? 0),
    monthInvoices: rev?.n ?? 0,
    totalFees: Number(allRev?.fees ?? 0),
    totalHt: Number(allRev?.ht ?? 0),
    pendingDocs: pendingDocs.n,
    inReview: inReview.n,
    validFreelancers: validFreelancers.n,
    companies: companies.n,
    cardsToTranscribe: cards.n,
    failedPayments: failed.n,
    unreadMessages: messages.n,
    pendingPayouts: pendingPayouts.n,
    pendingPayoutsCents: Number(pendingPayouts.amount ?? 0),
    upcomingEvents: upcoming.n,
  };
}

export async function markMessageHandled(db: Db, adminId: string, id: string) {
  await db.update(s.contactMessages).set({ handled: true }).where(eq(s.contactMessages.id, id));
  await audit(db, adminId, "message.handled", "contact_message", id);
}

export async function bookingsWithStatus(db: Db, statuses: string[]) {
  return db
    .select({ b: s.bookings, e: s.events, c: s.companies })
    .from(s.bookings)
    .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .where(statuses.length ? inArray(s.bookings.status, statuses as (typeof s.bookings.$inferSelect.status)[]) : sql`true`)
    .orderBy(sql`${s.bookings.createdAt} desc`)
    .limit(200);
}
