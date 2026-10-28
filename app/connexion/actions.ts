"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { fail, safeNext, str, type FormState } from "@/lib/action";
import { endSession, getCurrentUser, startSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/client-ip";
import { check, hit, LIMITS, reset } from "@/lib/rate-limit";
import { login, requestPasswordReset, resetPassword, sendVerificationEmail } from "@/lib/services/accounts";

const HOME = { exposant: "/entreprise", commercial: "/commercial", admin: "/admin" } as const;

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const db = await getDb();
    const email = str(fd, "email").toLowerCase();
    await hit(db, `login:ip:${await clientIp()}`, LIMITS.loginIp);
    await check(db, `login:email:${email}`, LIMITS.loginEmail);
    const profile = await login(db, email, String(fd.get("password") ?? ""));
    if (!profile) {
      // seuls les échecs comptent pour un compte donné
      await hit(db, `login:email:${email}`, LIMITS.loginEmail);
      return { error: "E-mail ou mot de passe incorrect." };
    }
    await reset(db, `login:email:${email}`);
    await startSession(profile.id, profile.role, profile.sessionVersion);
    target = safeNext(str(fd, "next"), HOME[profile.role]);
  } catch (e) {
    return fail(e);
  }
  redirect(target);
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function forgotAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const db = await getDb();
    const email = str(fd, "email").toLowerCase();
    await hit(db, `reset:ip:${await clientIp()}`, LIMITS.resetIp);
    await hit(db, `reset:email:${email}`, LIMITS.resetEmail);
    await requestPasswordReset(db, email);
    return { ok: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé." };
  } catch (e) {
    return fail(e);
  }
}

export async function resetAction(token: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const db = await getDb();
    await hit(db, `reset:ip:${await clientIp()}`, LIMITS.resetIp);
    const pw = String(fd.get("password") ?? "");
    if (pw !== String(fd.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
    await resetPassword(db, token, pw);
  } catch (e) {
    return fail(e);
  }
  redirect("/connexion?reinitialise=1");
}

export async function resendVerificationAction(): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Session expirée : reconnectez-vous." };
    if (user.emailVerifiedAt) return { ok: "Votre adresse est déjà confirmée." };
    const db = await getDb();
    await hit(db, `verify:user:${user.id}`, LIMITS.verifyEmail);
    await sendVerificationEmail(db, user);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Nouveau lien envoyé. Pensez à vérifier vos courriers indésirables." };
}
