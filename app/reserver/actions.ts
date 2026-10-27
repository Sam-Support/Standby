"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { fail, file, str, strs, type FormState } from "@/lib/action";
import { getCurrentUser, requireCompany } from "@/lib/auth/session";
import { isRoleKey, ROLE_KEYS, type RoleKey } from "@/lib/domain";
import { createCustomer, paymentMethodSession, stripeEnabled } from "@/lib/integrations/stripe";
import {
  autoSelect,
  BookingError,
  cancelBooking,
  confirmBooking,
  getCompanyBooking,
  saveBriefStep,
  saveEventStep,
  saveTeamStep,
  toggleFavorite,
  toggleSelection,
} from "@/lib/services/booking";
import { requireVerifiedEmail } from "@/lib/services/accounts";
import { putFile, readUpload } from "@/lib/storage";

async function ctx(id: string) {
  const company = await requireCompany();
  const db = await getDb();
  const booking = await getCompanyBooking(db, id, company.id);
  if (!booking) throw new BookingError("Réservation introuvable.");
  return { db, company, booking };
}

export async function saveEvent(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { db, booking } = await ctx(id);
    await saveEventStep(db, booking, {
      eventId: str(fd, "eventId"),
      days: strs(fd, "days"),
      startTime: str(fd, "startTime"),
      endTime: str(fd, "endTime"),
      stand: str(fd, "stand"),
    });
  } catch (e) {
    return fail(e);
  }
  redirect(`/reserver/${id}/equipe`);
}

export async function saveTeam(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { db, booking } = await ctx(id);
    const positions: Partial<Record<RoleKey, number>> = {};
    for (const r of ROLE_KEYS) positions[r] = Math.max(0, Math.min(20, Number(fd.get(`qty_${r}`)) || 0));
    const languages = [...strs(fd, "languages"), ...(str(fd, "otherLanguage") ? [str(fd, "otherLanguage")] : [])];
    const outfit = str(fd, "outfit");
    await saveTeamStep(db, booking, { positions, languages, outfit: outfit === "perso" || outfit === "standby" ? outfit : "exposant" });
  } catch (e) {
    return fail(e);
  }
  redirect(`/reserver/${id}/brief`);
}

export async function saveBrief(id: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const { db, booking } = await ctx(id);
    const upload = await readUpload(file(fd, "brochure"), ["pdf", "ppt", "pptx"]);
    let brochure = null;
    if (upload) {
      const key = `private/bookings/${booking.id}/plaquette-${Date.now()}.${upload.name.split(".").pop()}`;
      await putFile(key, upload.data, upload.name);
      brochure = { path: key, name: upload.name };
    }
    const referent = str(fd, "referent");
    await saveBriefStep(db, booking, {
      referentId: referent && referent !== "autre" ? referent : null,
      otherName: str(fd, "otherName"),
      otherPhone: str(fd, "otherPhone"),
      highlights: str(fd, "highlights"),
      brief: str(fd, "brief"),
      leadTemplateId: str(fd, "template") || null,
      leadFrequency: str(fd, "frequency") === "fin" ? "fin" : "quotidien",
      brochure,
    });
    const fresh = await getCompanyBooking(db, id, booking.companyId);
    await autoSelect(db, fresh!);
  } catch (e) {
    return fail(e);
  }
  redirect(`/reserver/${id}/profils`);
}

export async function reselect(id: string): Promise<FormState> {
  try {
    const { db, booking } = await ctx(id);
    await autoSelect(db, booking, true);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/reserver/${id}/profils`);
  return {};
}

export async function toggleProfile(id: string, freelancerId: string, role: string): Promise<FormState> {
  try {
    const { db, booking } = await ctx(id);
    if (!isRoleKey(role)) throw new BookingError("Poste inconnu.");
    await toggleSelection(db, booking, freelancerId, role);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/reserver/${id}/profils`);
  return {};
}

export async function toggleFav(id: string, freelancerId: string): Promise<FormState> {
  try {
    const { db, company } = await ctx(id);
    await toggleFavorite(db, company.id, freelancerId);
  } catch (e) {
    return fail(e);
  }
  revalidatePath(`/reserver/${id}/profils`);
  return {};
}

/** Confirmation : fige le devis, envoie les missions, puis enregistre le moyen de paiement (Stripe). */
export async function confirm(id: string, _: FormState, fd: FormData): Promise<FormState> {
  let target = `/reserver/${id}/confirmation`;
  try {
    if (!fd.get("cgv")) return { error: "Merci d’accepter les conditions de prestation pour confirmer." };
    const { db, company, booking } = await ctx(id);
    const user = await getCurrentUser();
    requireVerifiedEmail(user!);
    await confirmBooking(db, booking, user!.id);
    if (stripeEnabled() && !company.stripePaymentMethodId) {
      let customerId = company.stripeCustomerId;
      if (!customerId) {
        customerId = await createCustomer(user!.email, company.name, company.id);
        await db.update(s.companies).set({ stripeCustomerId: customerId }).where(eq(s.companies.id, company.id));
      }
      target = await paymentMethodSession(customerId, booking.id, company.id);
    }
  } catch (e) {
    return fail(e);
  }
  redirect(target);
}

export async function paymentSetup(id: string): Promise<FormState> {
  let target = "";
  try {
    const { db, company, booking } = await ctx(id);
    if (!stripeEnabled()) return { error: "Paiement en ligne non configuré." };
    const user = await getCurrentUser();
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      customerId = await createCustomer(user!.email, company.name, company.id);
      await db.update(s.companies).set({ stripeCustomerId: customerId }).where(eq(s.companies.id, company.id));
    }
    target = await paymentMethodSession(customerId, booking.id, company.id);
  } catch (e) {
    return fail(e);
  }
  redirect(target);
}

export async function cancel(id: string): Promise<FormState> {
  try {
    const { db, booking } = await ctx(id);
    const user = await getCurrentUser();
    await cancelBooking(db, booking, user!.id);
  } catch (e) {
    return fail(e);
  }
  redirect(`/entreprise/reservations/${id}?annulee=1`);
}
