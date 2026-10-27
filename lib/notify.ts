import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, notifications, profiles } from "@/db/schema";
import { sendEmail } from "./integrations/email";

/** Notification dans l'espace de l'utilisateur + e-mail. */
export async function notify(db: Db, userId: string, n: { title: string; body: string; link?: string; email?: boolean }) {
  await db.insert(notifications).values({ userId, title: n.title, body: n.body, link: n.link });
  if (n.email === false) return;
  const [p] = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.id, userId));
  if (p) await sendEmail({ to: p.email, subject: n.title, text: n.body, link: n.link ? { label: "Ouvrir standby", href: n.link } : undefined }, db);
}

export async function audit(db: Db, actorId: string | null, action: string, entity: string, entityId?: string, data?: unknown) {
  await db.insert(auditLog).values({ actorId, action, entity, entityId, data: data as object | undefined });
}
