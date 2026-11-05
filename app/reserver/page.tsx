import Link from "@/components/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { PageHead } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { booking } from "@/lib/i18n/messages/booking";
import { getFmt, getMessages } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getMessages(booking)).meta.list };
}

export default async function Page() {
  const company = await requireCompany("/reserver");
  const db = await getDb();
  const drafts = await db
    .select({ b: s.bookings, e: s.events })
    .from(s.bookings)
    .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .where(and(eq(s.bookings.companyId, company.id), eq(s.bookings.status, "brouillon")))
    .orderBy(desc(s.bookings.createdAt))
    .limit(10);
  const m = await getMessages(booking);
  const t = m.list;
  const f = await getFmt();
  return (
    <>
      <PageHead
        label={m.head.label}
        title={m.head.title}
        actions={
          <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
            {t.new}
          </Link>
        }
      >
        {m.head.lead}
      </PageHead>
      <section className="clay panel">
        <h2>{t.drafts}</h2>
        {drafts.length === 0 && <p className="muted">{t.none}</p>}
        {drafts.map(({ b, e }) => (
          <div key={b.id} className="brow">
            <div>
              <b>{e?.name ?? t.toChoose}</b>
              <div className="muted small">
                {e ? `${e.city} · ${f.dateRange(e.startsOn, e.endsOn)} · ` : ""}
                {t.started(f.longDate(b.createdAt), b.ref)}
              </div>
            </div>
            <Link className="clay s btn sm" href={`/reserver/${b.id}/evenement`}>
              {t.resume}
            </Link>
          </div>
        ))}
      </section>
    </>
  );
}
