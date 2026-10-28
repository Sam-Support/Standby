"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { fail, str, type FormState } from "@/lib/action";
import { endSession, requireUser, startSession } from "@/lib/auth/session";
import { hit, LIMITS } from "@/lib/rate-limit";
import { changePassword, requestEmailChange } from "@/lib/services/accounts";
import { deleteAccount } from "@/lib/services/privacy";

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireUser(undefined, "/compte");
    const next = String(fd.get("password") ?? "");
    if (next !== String(fd.get("confirm") ?? "")) return { error: "Les deux nouveaux mots de passe ne correspondent pas." };
    const db = await getDb();
    await hit(db, `account:user:${user.id}`, LIMITS.accountChange);
    const version = await changePassword(db, user, String(fd.get("current") ?? ""), next);
    await startSession(user.id, user.role, version); // cet appareil reste connecté
  } catch (e) {
    return fail(e);
  }
  return { ok: "Mot de passe modifié. Vos autres appareils ont été déconnectés." };
}

export async function changeEmailAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  try {
    const user = await requireUser(undefined, "/compte");
    const db = await getDb();
    await hit(db, `account:user:${user.id}`, LIMITS.accountChange);
    await requestEmailChange(db, user, email, String(fd.get("password") ?? ""));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/compte");
  return { ok: `Lien de confirmation envoyé à ${email}. Votre adresse actuelle reste valable jusqu’à la confirmation.` };
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await requireUser(undefined, "/compte");
    if (str(fd, "confirm").toLowerCase() !== user.email.toLowerCase()) {
      return { error: "Recopiez exactement votre adresse e-mail pour confirmer la suppression." };
    }
    await deleteAccount(await getDb(), user.id);
    await endSession();
  } catch (e) {
    return fail(e);
  }
  redirect("/?compte=supprime");
}
