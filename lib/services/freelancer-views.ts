import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { addDays, nextMonday, todayIso } from "@/lib/format";
import { billableMinutesPerDay } from "@/lib/pricing";

export async function freelancerMissions(db: Db, freelancerId: string) {
  const rows = await db
    .select({ a: s.assignments, b: s.bookings, e: s.events, c: s.companies })
    .from(s.assignments)
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .where(and(eq(s.assignments.freelancerId, freelancerId), inArray(s.assignments.status, ["proposee", "acceptee", "refusee", "expiree", "annulee"])))
    .orderBy(desc(s.assignments.createdAt));
  const ids = rows.map((r) => r.a.id);
  const sheets = ids.length ? await db.select().from(s.timesheets).where(inArray(s.timesheets.assignmentId, ids)) : [];
  const batches = ids.length ? await db.select().from(s.leadBatches).where(inArray(s.leadBatches.assignmentId, ids)) : [];
  const today = todayIso();
  return rows.map((r) => {
    const days = [...r.b.days].sort();
    const mine = sheets.filter((t) => t.assignmentId === r.a.id);
    const minutesPerDay = billableMinutesPerDay(r.b.startTime, r.b.endTime);
    return {
      ...r,
      days,
      first: days[0],
      last: days.at(-1)!,
      minutesPerDay,
      estimatedCents: Math.round((r.a.hourlyRateCents * minutesPerDay * days.length) / 60),
      declaredDays: mine.length,
      pastDays: days.filter((d) => d <= today).length,
      timesheets: mine,
      leadsSent: batches.filter((x) => x.assignmentId === r.a.id && x.status !== "brouillon").reduce((n, x) => n + x.rowsCount, 0),
      started: days[0] <= today,
    };
  });
}

export async function freelancerEarnings(db: Db, freelancerId: string) {
  const payouts = await db.select().from(s.payouts).where(eq(s.payouts.freelancerId, freelancerId));
  const monday = nextMonday();
  const weeks = Array.from({ length: 6 }, (_, i) => addDays(monday, (i - 5) * 7));
  const byWeek = weeks.map((w) => payouts.filter((p) => p.scheduledFor === w).reduce((n, p) => n + p.amountCents, 0));
  const upcoming = payouts.filter((p) => p.status === "planifie").reduce((n, p) => n + p.amountCents, 0);
  const total = payouts.filter((p) => p.status === "transfere").reduce((n, p) => n + p.amountCents, 0);
  return { weeks, byWeek, upcoming, total, nextPayout: monday };
}
