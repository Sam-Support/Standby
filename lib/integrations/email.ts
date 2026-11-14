import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/config";
import { notices } from "@/lib/i18n/messages/notices";

/**
 * E-mails transactionnels via Resend (RESEND_API_KEY, EMAIL_FROM sur un domaine vérifié chez Resend).
 * Sans clé, les messages sont écrits dans les logs et, si une base est fournie, dans le journal visible
 * dans /admin/emails (état « simulé », liens compris). Avec la clé, chaque envoi y est suivi jusqu'à la
 * remise grâce au webhook Resend (app/api/resend/webhook). Un échec d'envoi ne casse jamais l'action en cours.
 */

/** Adresse publique : APP_URL, sinon celle que Vercel fournit (domaine de production, ou adresse de l'aperçu). */
export const appUrl = () => {
  const vercel = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return (process.env.APP_URL || (vercel && `https://${vercel}`) || "http://localhost:3000").replace(/\/$/, "");
};
export const resendEnabled = () => Boolean(process.env.RESEND_API_KEY);

const PLACEHOLDER_FROM = "Stand-By <notifications@standby.example>";

/** Réglages et points à corriger avant d'envoyer pour de vrai (affichés dans /admin/emails). */
export function emailConfig() {
  const from = process.env.EMAIL_FROM || PLACEHOLDER_FROM;
  const replyTo = process.env.EMAIL_REPLY_TO || process.env.SUPPORT_EMAIL || null;
  const problems: string[] = [];
  if (resendEnabled()) {
    if (!process.env.EMAIL_FROM) problems.push("EMAIL_FROM manquant : indiquez une adresse du domaine vérifié chez Resend.");
    else if (/standby\.example|votre-domaine/.test(from)) problems.push("EMAIL_FROM utilise encore l’adresse d’exemple.");
    if (!process.env.RESEND_WEBHOOK_SECRET) problems.push("RESEND_WEBHOOK_SECRET manquant : la remise et les rebonds ne sont pas suivis.");
    if (/localhost|127\.0\.0\.1/.test(appUrl())) problems.push("APP_URL pointe vers localhost : les liens des e-mails ne fonctionneront pas.");
  }
  return { enabled: resendEnabled(), from, replyTo, webhook: Boolean(process.env.RESEND_WEBHOOK_SECRET), problems };
}

export type EmailCategory = "compte" | "notification" | "contact" | "crm" | "test";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  link?: { label: string; href: string };
  lang?: Lang;
  /** Regroupement dans Resend (tag) et dans le journal */
  category?: EmailCategory;
  /** Adresse de réponse propre à ce message (ex. visiteur du formulaire de contact) */
  replyTo?: string;
};

export type SendResult = { status: "simule" | "envoye" | "echec"; id?: string; error?: string };

export async function sendEmail(msg: EmailMessage, db?: Db): Promise<SendResult> {
  const href = msg.link ? (msg.link.href.startsWith("http") ? msg.link.href : `${appUrl()}${msg.link.href}`) : null;
  const lang = msg.lang ?? DEFAULT_LANG;
  const category = msg.category ?? "notification";
  const text = href ? `${msg.text}\n\n${msg.link!.label}${lang === "fr" ? " :" : ":"} ${href}` : msg.text;

  if (!resendEnabled()) {
    console.info(`[email] → ${msg.to} · ${msg.subject}${href ? ` · ${href}` : ""}`);
    if (db) await db.insert(emailOutbox).values({ to: msg.to, subject: msg.subject, text: msg.text, link: href, category, status: "simule" });
    return { status: "simule" };
  }

  // journal d'abord : son identifiant sert de clé d'idempotence (pas de doublon si Resend reçoit deux fois la requête)
  const [row] = db
    ? await db.insert(emailOutbox).values({ to: msg.to, subject: msg.subject, text: msg.text, category, status: "en_attente" }).returning({ id: emailOutbox.id })
    : [{ id: randomUUID() }];
  const { from, replyTo } = emailConfig();
  const payload = {
    from,
    to: [msg.to],
    subject: msg.subject,
    html: renderHtml(msg, href, lang),
    text,
    ...((msg.replyTo ?? replyTo) ? { reply_to: msg.replyTo ?? replyTo } : {}),
    tags: [{ name: "category", value: category }],
  };

  let result: SendResult = { status: "echec", error: "aucune réponse" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": row.id },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        result = { status: "envoye", id };
        break;
      }
      result = { status: "echec", error: `Resend ${res.status} : ${(await res.text()).slice(0, 500)}` };
      // limite de débit ou panne passagère : on réessaie ; erreur de la requête (adresse, domaine…) : inutile
      if (res.status !== 429 && res.status < 500) break;
      await pause(Number(res.headers.get("retry-after")) * 1000 || attempt * 1000);
    } catch (e) {
      result = { status: "echec", error: e instanceof Error ? e.message : String(e) };
      await pause(attempt * 1000);
    }
  }
  if (result.status === "echec") console.error(`[email] échec d’envoi à ${msg.to} · ${msg.subject} : ${result.error}`);
  if (db) {
    await db
      .update(emailOutbox)
      .set({ status: result.status, providerId: result.id ?? null, error: result.error ?? null, updatedAt: new Date() })
      .where(eq(emailOutbox.id, row.id));
  }
  return result;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, Math.min(ms, 5000)));

function renderHtml(msg: EmailMessage, href: string | null, lang: Lang) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(msg.subject)}</title></head>
<body style="margin:0;padding:24px;background:#F6F5F2"><div style="font-family:Arial,sans-serif;color:#1B2150;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;line-height:1.55">
<p style="font-size:22px;font-weight:700;margin:0 0 16px">stand-by</p>
${msg.text
  .split("\n\n")
  .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
  .join("")}
${href ? `<p><a href="${href}" style="display:inline-block;background:#4D58EE;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700">${escapeHtml(msg.link!.label)}</a></p>` : ""}
<p style="color:#575B7E;font-size:12px;margin-top:24px">${escapeHtml(notices(lang).footer)}</p></div></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
