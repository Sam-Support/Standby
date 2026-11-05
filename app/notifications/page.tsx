import Link from "@/components/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema as s } from "@/db";
import { PageHead } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { account } from "@/lib/i18n/messages/account";
import { getFmt, getMessages } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getMessages(account)).notifications.title };
}

async function markAllRead() {
  "use server";
  const user = await requireUser();
  const db = await getDb();
  await db
    .update(s.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt)));
  revalidatePath("/", "layout");
}

export default async function Page() {
  const user = await requireUser(undefined, "/notifications");
  const db = await getDb();
  const t = (await getMessages(account)).notifications;
  const f = await getFmt();
  const rows = await db.select().from(s.notifications).where(eq(s.notifications.userId, user.id)).orderBy(desc(s.notifications.createdAt)).limit(100);
  return (
    <>
      <PageHead
        label={t.label}
        title={t.title}
        actions={
          rows.some((r) => !r.readAt) ? (
            <form action={markAllRead}>
              <button className="clay s btn sm ghost">{t.markAll}</button>
            </form>
          ) : null
        }
      />
      <section className="clay panel">
        {rows.length === 0 && <p className="muted">{t.empty}</p>}
        {rows.map((n) => {
          const inner = (
            <>
              <div style={{ flex: 1 }}>
                <b>{n.title}</b>
                {n.body && <p className="muted small" style={{ marginTop: 4 }}>{n.body}</p>}
              </div>
              <span className="muted small" style={{ whiteSpace: "nowrap" }}>{f.longDateTime(n.createdAt)}</span>
            </>
          );
          return n.link ? (
            <Link key={n.id} href={n.link} className={`notif${n.readAt ? "" : " unread"}`}>
              {inner}
            </Link>
          ) : (
            <div key={n.id} className={`notif${n.readAt ? "" : " unread"}`}>
              {inner}
            </div>
          );
        })}
      </section>
    </>
  );
}
