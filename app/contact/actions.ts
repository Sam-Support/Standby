"use server";

import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { fail, str, type FormState } from "@/lib/action";
import { sendEmail } from "@/lib/integrations/email";
import { clientIp } from "@/lib/client-ip";
import { notify } from "@/lib/notify";
import { hit, LIMITS } from "@/lib/rate-limit";

export async function sendContact(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const name = str(fd, "name");
    const email = str(fd, "email");
    const message = str(fd, "message");
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Indiquez votre nom et une adresse e-mail valide." };
    if (message.length < 10) return { error: "Votre message est trop court." };
    if (!fd.get("consent")) return { error: "Merci d’accepter le traitement de vos données pour cette demande." };
    const db = await getDb();
    await hit(db, `contact:ip:${await clientIp()}`, LIMITS.contactIp);
    await db.insert(s.contactMessages).values({
      audience: str(fd, "audience") || "autre",
      name: name.slice(0, 120),
      email: email.slice(0, 200),
      subject: str(fd, "subject").slice(0, 120) || "Autre demande",
      bookingRef: str(fd, "ref").slice(0, 20) || null,
      message: message.slice(0, 5000),
    });
    const admins = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.role, "admin"));
    for (const a of admins) await notify(db, a.id, { title: "Nouveau message de contact", body: `${name} · ${str(fd, "subject")}`, link: "/admin/messages", email: false });
    if (process.env.SUPPORT_EMAIL) {
      await sendEmail({ to: process.env.SUPPORT_EMAIL, subject: `[Contact] ${str(fd, "subject")}`, text: `${name} <${email}>\n\n${message}` }, db);
    }
    return { ok: "Message envoyé. Nous vous répondons par e-mail en jours ouvrés." };
  } catch (e) {
    return fail(e);
  }
}
