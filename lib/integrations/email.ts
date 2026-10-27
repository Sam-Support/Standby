import type { Db } from "@/db";
import { emailOutbox } from "@/db/schema";

/**
 * E-mails transactionnels via Resend (RESEND_API_KEY). Sans clé, les messages sont écrits dans les logs
 * et, si une base est fournie, dans la boîte d'envoi simulée visible dans /admin/emails.
 */

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function sendEmail(msg: { to: string; subject: string; text: string; link?: { label: string; href: string } }, db?: Db) {
  const href = msg.link ? (msg.link.href.startsWith("http") ? msg.link.href : `${appUrl()}${msg.link.href}`) : null;
  const html = `<div style="font-family:Arial,sans-serif;color:#1B2150;max-width:560px;line-height:1.55">
<p style="font-size:22px;font-weight:700;margin:0 0 16px">standby</p>
${msg.text
  .split("\n\n")
  .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
  .join("")}
${href ? `<p><a href="${href}" style="display:inline-block;background:#4D58EE;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:700">${escapeHtml(msg.link!.label)}</a></p>` : ""}
<p style="color:#575B7E;font-size:12px">Standby · salons professionnels et foires</p></div>`;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] → ${msg.to} · ${msg.subject}${href ? ` · ${href}` : ""}`);
    if (db) await db.insert(emailOutbox).values({ to: msg.to, subject: msg.subject, text: msg.text, link: href });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Standby <notifications@standby.example>",
      to: [msg.to],
      subject: msg.subject,
      html,
      text: href ? `${msg.text}\n\n${msg.link!.label} : ${href}` : msg.text,
    }),
  });
  if (!res.ok) console.error(`[email] échec Resend ${res.status} : ${await res.text()}`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
