"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { fail, file, parseHours, str, type FormState } from "@/lib/action";
import { getCurrentUser, requireCompany } from "@/lib/auth/session";
import { companyIdentity, companyLeadFormat, companyReferents, companyWeb } from "@/lib/services/accounts";
import { validateAssignmentHours } from "@/lib/services/hours";
import { parseLeadWorkbook } from "@/lib/services/leads";
import { submitReview } from "@/lib/services/reviews";
import { readUpload } from "@/lib/storage";

export async function validateHours(assignmentId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const company = await requireCompany();
    const user = await getCurrentUser();
    const raw = str(fd, "hours");
    const minutes = raw ? parseHours(raw) : undefined;
    if (minutes !== undefined && !Number.isFinite(minutes)) return { error: "Heures invalides : indiquez par exemple 16 ou 15:30." };
    await validateAssignmentHours(await getDb(), assignmentId, company.id, user!.id, minutes);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/entreprise", "layout");
  return { ok: "Heures validées." };
}

export async function reviewAction(assignmentId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const company = await requireCompany();
    await submitReview(await getDb(), company.id, assignmentId, Number(str(fd, "rating")), str(fd, "comment"));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/entreprise", "layout");
  return { ok: "Merci, votre avis est publié." };
}

export async function updateIdentity(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const company = await requireCompany();
    await companyIdentity(await getDb(), company.ownerId, { name: str(fd, "name"), siret: str(fd, "siret"), sector: str(fd, "sector"), size: str(fd, "size") });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/entreprise", "layout");
  return { ok: "Société mise à jour." };
}

export async function updateWeb(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const company = await requireCompany();
    const brochure = await readUpload(file(fd, "brochure"), ["pdf", "ppt", "pptx"]);
    await companyWeb(await getDb(), company, { website: str(fd, "website"), linkedin: str(fd, "linkedin"), brochure });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/entreprise", "layout");
  return { ok: "Site, LinkedIn et plaquette mis à jour." };
}

export async function updateReferents(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const company = await requireCompany();
    const names = fd.getAll("ref_name").map(String);
    const titles = fd.getAll("ref_title").map(String);
    const phones = fd.getAll("ref_phone").map(String);
    await companyReferents(await getDb(), company, names.map((name, i) => ({ name, title: titles[i] ?? "", phone: phones[i] ?? "" })));
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/entreprise", "layout");
  return { ok: "Référents mis à jour." };
}

export async function updateLeadFormat(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const company = await requireCompany();
    let columns = str(fd, "columns")
      .split(/[\n;,]/)
      .map((c) => c.trim())
      .filter(Boolean);
    const template = await readUpload(file(fd, "template"), ["xlsx"]);
    if (template) columns = (await parseLeadWorkbook(template.data)).headers;
    await companyLeadFormat(await getDb(), company, {
      mode: str(fd, "mode") as "excel" | "crm" | "standard",
      columns,
      crmProvider: "HubSpot",
      crmAdminEmail: str(fd, "crmAdminEmail"),
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/entreprise", "layout");
  return { ok: "Format des leads mis à jour." };
}
