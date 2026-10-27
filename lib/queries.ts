import { and, asc, avg, count, eq, gte, inArray, max, sql } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { listDays, todayIso } from "./format";
import { daysOverlap } from "./matching";
import { fileUrl } from "./storage";

export type EventCard = {
  id: string;
  slug: string;
  name: string;
  kind: "salon" | "foire";
  city: string;
  startsOn: string;
  endsOn: string;
  setupOn: string | null;
  sector: string;
  specialty: string | null;
  siteUrl: string | null;
  color: string;
  logoUrl: string | null;
  available: number;
};

/** Événements publiés à venir, avec le nombre de profils validés libres sur leurs dates. */
export async function upcomingEvents(db: Db, opts: { limit?: number; kind?: "salon" | "foire"; from?: string } = {}): Promise<EventCard[]> {
  const from = opts.from ?? todayIso();
  const rows = await db
    .select()
    .from(s.events)
    .where(and(eq(s.events.published, true), gte(s.events.endsOn, from), opts.kind ? eq(s.events.kind, opts.kind) : sql`true`))
    .orderBy(asc(s.events.startsOn))
    .limit(opts.limit ?? 100);
  const [{ n: total }] = await db.select({ n: count() }).from(s.freelancers).where(eq(s.freelancers.status, "valide"));
  const busy = await db
    .select({ freelancerId: s.assignments.freelancerId, days: s.bookings.days })
    .from(s.assignments)
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .where(and(inArray(s.assignments.status, ["proposee", "acceptee"]), sql`${s.bookings.status} <> 'annulee'`));
  return rows.map((e) => {
    const days = listDays(e.startsOn, e.endsOn);
    const engaged = new Set(busy.filter((b) => daysOverlap(b.days, days)).map((b) => b.freelancerId));
    return {
      id: e.id,
      slug: e.slug,
      name: e.name,
      kind: e.kind,
      city: e.city,
      startsOn: e.startsOn,
      endsOn: e.endsOn,
      setupOn: e.setupOn,
      sector: e.sector,
      specialty: e.specialty,
      siteUrl: e.siteUrl,
      color: e.color,
      logoUrl: e.logoAuthorized ? fileUrl(e.logoPath) : null,
      available: Math.max(0, total - engaged.size),
    };
  });
}

export async function platformStats(db: Db) {
  const [f] = await db
    .select({ n: count(), rating: avg(s.freelancers.ratingX10) })
    .from(s.freelancers)
    .where(eq(s.freelancers.status, "valide"));
  const [r] = await db.select({ rating: avg(s.reviews.rating), n: count() }).from(s.reviews);
  const [v] = await db.select({ verified: max(s.events.verifiedOn) }).from(s.events).where(eq(s.events.published, true));
  return {
    freelancers: f.n,
    ratingX10: r.n > 0 ? Math.round(Number(r.rating) * 10) : Math.round(Number(f.rating ?? 0)),
    verifiedOn: v.verified,
  };
}
