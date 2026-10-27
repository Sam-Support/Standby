"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { fail, str, type FormState } from "@/lib/action";
import { endSession, requireUser } from "@/lib/auth/session";
import { deleteAccount } from "@/lib/services/privacy";

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
