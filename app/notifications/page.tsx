import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema as s } from "@/db";
import { PageHead } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { longDateTime } from "@/lib/format";

export const metadata = { title: "Notifications" };

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
  const rows = await db.select().from(s.notifications).where(eq(s.notifications.userId, user.id)).orderBy(desc(s.notifications.createdAt)).limit(100);
  return (
    <>
      <PageHead
        label="Votre compte"
        title="Notifications"
        actions={
          rows.some((r) => !r.readAt) ? (
            <form action={markAllRead}>
              <button className="clay s btn sm ghost">Tout marquer comme lu</button>
            </form>
          ) : null
        }
      />
      <section className="clay panel">
        {rows.length === 0 && <p className="muted">Aucune notification pour l’instant.</p>}
        {rows.map((n) => {
          const inner = (
            <>
              <div style={{ flex: 1 }}>
                <b>{n.title}</b>
                {n.body && <p className="muted small" style={{ marginTop: 4 }}>{n.body}</p>}
              </div>
              <span className="muted small" style={{ whiteSpace: "nowrap" }}>{longDateTime(n.createdAt)}</span>
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
