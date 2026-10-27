"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { fail, safeNext, str, type FormState } from "@/lib/action";
import { endSession, startSession } from "@/lib/auth/session";
import { login, requestPasswordReset, resetPassword } from "@/lib/services/accounts";

const HOME = { exposant: "/entreprise", commercial: "/commercial", admin: "/admin" } as const;

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  let target: string;
  try {
    const db = await getDb();
    const profile = await login(db, str(fd, "email"), String(fd.get("password") ?? ""));
    if (!profile) return { error: "E-mail ou mot de passe incorrect." };
    await startSession(profile.id, profile.role);
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
    await requestPasswordReset(await getDb(), str(fd, "email"));
    return { ok: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé." };
  } catch (e) {
    return fail(e);
  }
}

export async function resetAction(token: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const pw = String(fd.get("password") ?? "");
    if (pw !== String(fd.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
    await resetPassword(await getDb(), token, pw);
  } catch (e) {
    return fail(e);
  }
  redirect("/connexion?reinitialise=1");
}
