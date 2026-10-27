"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { eurosToCents, fail, file, str, type FormState } from "@/lib/action";
import { requireAdmin } from "@/lib/auth/session";
import { PRICING_DEFAULTS } from "@/lib/domain";
import { reviewDocument } from "@/lib/services/accounts";
import { importEventsCsv, markMessageHandled, removeEventLogo, saveEvent, setPricing } from "@/lib/services/admin";
import { chargeBooking, runPayouts } from "@/lib/services/billing";
import { advanceBookings } from "@/lib/services/booking";
import { cancelBooking } from "@/lib/services/cancellation";
import { autoValidateHours, validateAssignmentHours } from "@/lib/services/hours";
import { transcribeCard } from "@/lib/services/leads";
import { purgeExpiredData } from "@/lib/services/privacy";
import { sendReminders } from "@/lib/services/reminders";
import { deleteReview } from "@/lib/services/reviews";
import { readUpload } from "@/lib/storage";

export async function saveEventAction(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  let eventId: string;
  try {
    const admin = await requireAdmin();
    const logo = await readUpload(file(fd, "logo"), ["png", "jpg", "jpeg", "webp", "svg"]);
    eventId = await saveEvent(
      await getDb(),
      admin.id,
      id,
      {
        name: str(fd, "name"),
        kind: str(fd, "kind") === "foire" ? "foire" : "salon",
        city: str(fd, "city"),
        venue: str(fd, "venue"),
        startsOn: str(fd, "startsOn"),
        endsOn: str(fd, "endsOn"),
        setupOn: str(fd, "setupOn") || null,
        sector: str(fd, "sector"),
        specialty: str(fd, "specialty") || null,
        siteUrl: str(fd, "siteUrl") || null,
        color: str(fd, "color"),
        published: fd.get("published") === "on",
        verified: fd.get("verified") === "on",
        logoAuthorized: fd.get("logoAuthorized") === "on",
      },
      logo,
    );
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/salons/${eventId}?ok=1`);
}

export async function removeLogoAction(id: string): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    await removeEventLogo(await getDb(), admin.id, id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Logo retiré." };
}

export async function importCsvAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    const f = await readUpload(file(fd, "csv"), ["csv", "txt"]);
    if (!f) return { error: "Choisissez un fichier CSV." };
    const res = await importEventsCsv(await getDb(), admin.id, f.data.toString("utf8"));
    revalidatePath("/", "layout");
    return res.errors.length ? { error: `${res.created} salon(s) importé(s). ${res.errors.slice(0, 5).join(" · ")}` } : { ok: `${res.created} salon(s) importé(s).` };
  } catch (e) {
    return fail(e);
  }
}

export async function setPricingAction(key: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    const def = PRICING_DEFAULTS[key];
    const raw = str(fd, "value");
    const value =
      def?.unit === "bps" ? Math.round(Number(raw.replace(",", ".")) * 100) : def?.unit === "days" ? Number(raw) : eurosToCents(raw);
    const when = str(fd, "effectiveFrom");
    const effectiveFrom = when ? new Date(`${when}T00:00:00`) : new Date();
    await setPricing(await getDb(), admin.id, key, value, effectiveFrom);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: "Réglage enregistré." };
}

export async function reviewDocAction(docId: string, status: "valide" | "refuse", _: FormState, fd: FormData): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    if (status === "refuse" && !str(fd, "comment")) return { error: "Indiquez ce qui est à corriger." };
    await reviewDocument(await getDb(), docId, admin.id, status, str(fd, "comment"));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  return {};
}

export async function freelancerStatusAction(freelancerId: string, status: "valide" | "refuse"): Promise<FormState> {
  try {
    await requireAdmin();
    const db = await getDb();
    await db.update(s.freelancers).set({ status }).where(eq(s.freelancers.id, freelancerId));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  return {};
}

export async function adminValidateHours(assignmentId: string, companyId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    const raw = str(fd, "hours");
    const minutes = raw ? Math.round(Number(raw.replace(",", ".")) * 60) : undefined;
    await validateAssignmentHours(await getDb(), assignmentId, companyId, admin.id, minutes);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: "Heures validées." };
}

export async function retryPaymentAction(paymentId: string): Promise<FormState> {
  try {
    await requireAdmin();
    const db = await getDb();
    await db.update(s.payments).set({ status: "en_attente", error: null }).where(eq(s.payments.id, paymentId));
    await chargeBooking(db, paymentId);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: "Paiement relancé." };
}

export async function adminCancelAction(bookingId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    const db = await getDb();
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, bookingId));
    await cancelBooking(db, b, admin.id, { waive: fd.get("waive") === "on" });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin", "layout");
  return { ok: "Réservation annulée." };
}

export async function runJobsAction(): Promise<FormState> {
  try {
    await requireAdmin();
    const db = await getDb();
    const a = await advanceBookings(db);
    const r = await sendReminders(db);
    const h = await autoValidateHours(db);
    const p = await runPayouts(db);
    const purged = await purgeExpiredData(db);
    revalidatePath("/admin", "layout");
    return {
      ok: `Tâches exécutées : ${a} changement(s) de statut, ${r} rappel(s), ${h} validation(s) automatique(s), ${p} virement(s), ${purged.leads} lead(s) purgé(s).`,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function transcribeAction(cardId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    await transcribeCard(await getDb(), cardId, admin.id, {
      nom: str(fd, "nom"),
      prenom: str(fd, "prenom"),
      societe: str(fd, "societe"),
      fonction: str(fd, "fonction"),
      email: str(fd, "email"),
      telephone: str(fd, "telephone"),
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/cartes");
  return { ok: "Carte saisie." };
}

export async function deleteReviewAction(reviewId: string): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    await deleteReview(await getDb(), admin.id, reviewId);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/avis");
  return { ok: "Avis supprimé, note recalculée." };
}

export async function handleMessageAction(id: string): Promise<FormState> {
  try {
    const admin = await requireAdmin();
    await markMessageHandled(await getDb(), admin.id, id);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/messages");
  return {};
}
