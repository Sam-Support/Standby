"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { eurosToCents, fail, file, files, parseHours, str, strs, type FormState } from "@/lib/action";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import type { DocumentKey } from "@/lib/domain";
import {
  freelancerIdentity,
  freelancerProfile,
  freelancerSizes,
  requireVerifiedEmail,
  stripeOnboarding,
  uploadFreelancerDocument,
} from "@/lib/services/accounts";
import { respondToMission, withdrawFromMission } from "@/lib/services/booking";
import { declareHours, respondToAdjustment } from "@/lib/services/hours";
import { sendBatches, uploadCards, uploadLeadFile } from "@/lib/services/leads";
import { readUpload } from "@/lib/storage";

async function me() {
  const f = await requireFreelancer();
  const user = (await getCurrentUser())!;
  return { f, user, db: await getDb() };
}

export async function respond(assignmentId: string, accept: boolean): Promise<FormState> {
  try {
    const { user, db } = await me();
    if (accept) requireVerifiedEmail(user);
    await respondToMission(db, assignmentId, user.id, accept);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/commercial", "layout");
  return { ok: accept ? "Mission acceptée. L’exposant est prévenu." : "Mission refusée." };
}

export async function declare(assignmentId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, db } = await me();
    const entries = strs(fd, "day").map((day) => ({ day, minutes: parseHours(str(fd, `h_${day}`)) }));
    if (entries.some((e) => !Number.isFinite(e.minutes))) return { error: "Heures invalides : indiquez par exemple 8 ou 7:30." };
    await declareHours(db, assignmentId, user.id, entries);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/commercial", "layout");
  return { ok: "Heures déclarées. L’exposant les valide après l’événement." };
}

export async function withdraw(assignmentId: string, _: FormState, fd: FormData): Promise<FormState> {
  let replaced = false;
  try {
    const { user, db } = await me();
    if (fd.get("confirm") !== "on") return { error: "Cochez la case pour confirmer votre désistement." };
    ({ replaced } = await withdrawFromMission(db, assignmentId, user.id, str(fd, "reason")));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/commercial", "layout");
  return {
    ok: replaced
      ? "Désistement enregistré : un remplaçant a reçu la mission et l’exposant est prévenu."
      : "Désistement enregistré. Aucun remplaçant n’est libre pour l’instant : l’équipe Standby prend le relais auprès de l’exposant.",
  };
}

export async function answerAdjustment(assignmentId: string, accept: boolean, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, db } = await me();
    await respondToAdjustment(db, assignmentId, user.id, accept, str(fd, "reason"));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/commercial", "layout");
  return { ok: accept ? "Ajustement accepté : la paie part après la facturation de l’exposant." : "Contestation envoyée : l’équipe Standby arbitre et vous tient informé·e." };
}

export async function uploadLeadsAction(assignmentId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, db } = await me();
    const upload = await readUpload(file(fd, "file"), ["xlsx"]);
    if (!upload) return { error: "Choisissez un fichier Excel (.xlsx)." };
    const res = await uploadLeadFile(db, assignmentId, user.id, upload);
    revalidatePath(`/commercial/leads/${assignmentId}`);
    return { ok: `${res.batch.rowsCount} lignes lues · ${res.mapping.recognized}/${res.mapping.recognized + res.mapping.missing.length} colonnes reconnues.` };
  } catch (e) {
    return fail(e);
  }
}

export async function uploadCardsAction(assignmentId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { user, db } = await me();
    const uploads = [];
    for (const f of files(fd, "cards")) {
      const u = await readUpload(f, ["jpg", "jpeg", "png", "webp"]);
      if (u) uploads.push(u);
    }
    const res = await uploadCards(db, assignmentId, user.id, uploads);
    revalidatePath(`/commercial/leads/${assignmentId}`);
    return {
      ok:
        res.read === res.uploaded
          ? `${res.uploaded} carte(s) lue(s) automatiquement.`
          : `${res.uploaded} photo(s) reçue(s)${res.read ? `, ${res.read} lue(s) automatiquement` : ""}. Les autres sont saisies par l’équipe sous 24 h.`,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function sendLeads(assignmentId: string): Promise<FormState> {
  try {
    const { user, db } = await me();
    const n = await sendBatches(db, assignmentId, user.id);
    revalidatePath(`/commercial/leads/${assignmentId}`);
    return { ok: `${n} lead(s) envoyés à l’entreprise.` };
  } catch (e) {
    return fail(e);
  }
}

export async function updateIdentityAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { f, user, db } = await me();
    await freelancerIdentity(db, user.id, {
      firstName: str(fd, "firstName") || user.firstName,
      lastName: str(fd, "lastName") || user.lastName,
      phone: str(fd, "phone"),
      city: str(fd, "city") || f.city,
      bio: str(fd, "bio"),
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/commercial", "layout");
  return { ok: "Profil mis à jour." };
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const { f, db } = await me();
    await freelancerProfile(db, f, {
      roles: strs(fd, "roles"),
      specialties: [...strs(fd, "specialties"), ...(str(fd, "otherSpecialty") ? [str(fd, "otherSpecialty")] : [])],
      languages: strs(fd, "languages"),
      otherLanguage: str(fd, "otherLanguage"),
      hourlyRateCents: eurosToCents(str(fd, "rate")),
    });
    await freelancerSizes(db, f, { top: str(fd, "top"), pants: str(fd, "pants"), shoe: str(fd, "shoe") });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/commercial", "layout");
  return { ok: "Postes, langues, tarif et tailles mis à jour." };
}

export async function uploadDocAction(type: DocumentKey, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { f, db } = await me();
    const upload = await readUpload(file(fd, "doc"), ["pdf", "jpg", "jpeg", "png"]);
    if (!upload) return { error: "Choisissez un fichier." };
    await uploadFreelancerDocument(db, f, type, upload, type === "urssaf" ? str(fd, "issuedOn") : null);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/commercial/profil");
  return { ok: "Document reçu : il sera vérifié par l’équipe." };
}

export async function stripeSetupAction(): Promise<FormState> {
  let url: string | null = null;
  try {
    const { f, user, db } = await me();
    url = await stripeOnboarding(db, f, user.email);
  } catch (e) {
    return fail(e);
  }
  if (url) redirect(url);
  revalidatePath("/commercial", "layout");
  return { ok: "Virements activés (mode simulé : aucun compte Stripe configuré)." };
}
