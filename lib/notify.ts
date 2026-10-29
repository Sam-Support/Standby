import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditLog, notifications, profiles } from "@/db/schema";
import { DEFAULT_LANG, isLang, localizePath, type Lang } from "./i18n/config";
import { notices, type Notices } from "./i18n/messages/notices";
import { sendEmail } from "./integrations/email";

type Text = { title: string; body: string };
/** Texte fixe (messages internes, en français) ou choisi dans le catalogue selon la langue du destinataire. */
type Notice = { link?: string; email?: boolean } & (Text | { t: (n: Notices, lang: Lang) => Text });

/** Langue du compte (profiles.locale), français à défaut. */
export async function localeOf(db: Db, userId: string): Promise<Lang> {
  const [p] = await db.select({ locale: profiles.locale }).from(profiles).where(eq(profiles.id, userId));
  return isLang(p?.locale) ? p.locale : DEFAULT_LANG;
}

/** Notification dans l'espace de l'utilisateur + e-mail, dans la langue de son compte. */
export async function notify(db: Db, userId: string, n: Notice) {
  const [p] = await db.select({ email: profiles.email, locale: profiles.locale }).from(profiles).where(eq(profiles.id, userId));
  const lang: Lang = isLang(p?.locale) ? p.locale : DEFAULT_LANG;
  const catalog = notices(lang);
  const text = "t" in n ? n.t(catalog, lang) : n;
  await db.insert(notifications).values({ userId, title: text.title, body: text.body, link: n.link });
  if (n.email === false || !p) return;
  await sendEmail(
    { to: p.email, subject: text.title, text: text.body, link: n.link ? { label: catalog.open, href: localizePath(n.link, lang) } : undefined, lang },
    db,
  );
}

/** Même notification pour chaque administrateur. */
export async function notifyAdmins(db: Db, n: { title: string; body: string; link?: string; email?: boolean }) {
  const admins = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.role, "admin"));
  for (const a of admins) await notify(db, a.id, n);
}

export async function audit(db: Db, actorId: string | null, action: string, entity: string, entityId?: string, data?: unknown) {
  await db.insert(auditLog).values({ actorId, action, entity, entityId, data: data as object | undefined });
}
