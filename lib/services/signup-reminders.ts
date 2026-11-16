import { and, eq, gt, inArray, isNull, lt } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { signToken } from "@/lib/crypto";
import { DEFAULT_LANG, isLang, localizePath } from "@/lib/i18n/config";
import { notices } from "@/lib/i18n/messages/notices";
import { sendEmail } from "@/lib/integrations/email";

/** Relances envoyées 1, 3 puis 7 jours après la création du compte. */
export const SIGNUP_REMINDER_DAYS = [1, 3, 7];
/** Au-delà, on n'écrit plus : le compte reste utilisable, sans relance. */
export const SIGNUP_REMINDER_MAX_AGE_DAYS = 14;
/** Écart minimal entre deux relances d'un même compte (rattrapage après une panne des tâches planifiées). */
const MIN_GAP_HOURS = 20;
const VERIFY_TTL = 48 * 3600;
const DAY = 86_400_000;

/**
 * Relances automatiques des comptes restés en chemin (tâche planifiée) :
 * - inscription arrêtée avant la dernière étape : lien pour se reconnecter et reprendre ;
 * - inscription terminée mais adresse e-mail jamais confirmée : nouveau lien de confirmation.
 * Trois relances au plus par compte, jamais vers une adresse en échec, rien après 14 jours. Le compteur est
 * réservé avant l'envoi : deux passages simultanés n'envoient pas deux fois le même rappel.
 */
export async function sendSignupReminders(db: Db, now = new Date()) {
  const max = SIGNUP_REMINDER_DAYS.length;
  const rows = await db
    .select({ p: s.profiles, freelancerStep: s.freelancers.onboardingStep, companyStep: s.companies.onboardingStep })
    .from(s.profiles)
    .leftJoin(s.freelancers, eq(s.freelancers.userId, s.profiles.id))
    .leftJoin(s.companies, eq(s.companies.ownerId, s.profiles.id))
    .where(
      and(
        inArray(s.profiles.role, ["exposant", "commercial"]),
        lt(s.profiles.signupRemindersSent, max),
        isNull(s.profiles.emailUndeliverableAt),
        gt(s.profiles.createdAt, new Date(now.getTime() - SIGNUP_REMINDER_MAX_AGE_DAYS * DAY)),
      ),
    );
  let sent = 0;
  for (const { p, freelancerStep, companyStep } of rows) {
    if (p.role === "admin") continue;
    // étape à faire : 1 tant que la fiche n'existe pas, 5 quand l'inscription est terminée
    const step = (p.role === "commercial" ? freelancerStep : companyStep) ?? 1;
    const incomplete = step <= 4;
    if (!incomplete && p.emailVerifiedAt) continue;
    const n = p.signupRemindersSent;
    if (now.getTime() < p.createdAt.getTime() + SIGNUP_REMINDER_DAYS[n] * DAY) continue;
    if (p.signupRemindedAt && now.getTime() - p.signupRemindedAt.getTime() < MIN_GAP_HOURS * 3_600_000) continue;
    const [claimed] = await db
      .update(s.profiles)
      .set({ signupRemindersSent: n + 1, signupRemindedAt: now })
      .where(and(eq(s.profiles.id, p.id), eq(s.profiles.signupRemindersSent, n)))
      .returning({ id: s.profiles.id });
    if (!claimed) continue;

    const lang = isLang(p.locale) ? p.locale : DEFAULT_LANG;
    const last = n + 1 === max;
    if (incomplete) {
      const m = notices(lang).signupResume({ first: p.firstName, role: p.role, left: 5 - step, last });
      const resume = `/inscription/${p.role === "commercial" ? "commercial" : "entreprise"}`;
      await sendEmail(
        { to: p.email, subject: m.subject, text: m.text, link: { label: m.link, href: localizePath(`/connexion?next=${encodeURIComponent(resume)}`, lang) }, lang, category: "compte" },
        db,
      );
    } else {
      const m = notices(lang).verifyReminder({ first: p.firstName, last });
      const token = signToken("verify", { uid: p.id, email: p.email }, VERIFY_TTL);
      await sendEmail({ to: p.email, subject: m.subject, text: m.text, link: { label: m.link, href: localizePath(`/verifier-email/${token}`, lang) }, lang, category: "compte" }, db);
    }
    sent++;
  }
  return sent;
}
