"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { eurosToCents, fail, file, str, strs, type FormState } from "@/lib/action";
import { getCurrentCompany, getCurrentFreelancer, getCurrentUser, startSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/client-ip";
import { hit, LIMITS } from "@/lib/rate-limit";
import type { DocumentKey } from "@/lib/domain";
import {
  AccountError,
  companyIdentity,
  companyLeadFormat,
  companyReferents,
  companyWeb,
  freelancerIdentity,
  freelancerProfile,
  freelancerSizes,
  freelancerStatusStep,
  registerAccount,
  uploadFreelancerDocument,
} from "@/lib/services/accounts";
import { parseLeadWorkbook } from "@/lib/services/leads";
import { isValidSiret } from "@/lib/siret";
import { readUpload } from "@/lib/storage";

async function ensureAccount(fd: FormData, role: "exposant" | "commercial") {
  const user = await getCurrentUser();
  if (user) {
    if (user.role !== role) throw new AccountError("Vous êtes connecté·e avec un autre type de compte. Déconnectez-vous d’abord.");
    return user.id;
  }
  if (String(fd.get("password")) !== String(fd.get("confirm"))) throw new AccountError("Les deux mots de passe ne correspondent pas.");
  if (!fd.get("cgu")) throw new AccountError("Merci d’accepter les conditions générales d’utilisation.");
  const db = await getDb();
  await hit(db, `signup:ip:${await clientIp()}`, LIMITS.signupIp);
  const profile = await registerAccount(db, {
    email: str(fd, "email"),
    password: String(fd.get("password") ?? ""),
    role,
    firstName: str(fd, "firstName"),
    lastName: str(fd, "lastName"),
    phone: str(fd, "phone"),
  });
  await startSession(profile.id, role);
  return profile.id;
}

export async function companyStep(step: number, _: FormState, fd: FormData): Promise<FormState> {
  let next = "";
  try {
    const db = await getDb();
    if (step === 1) {
      if (!isValidSiret(str(fd, "siret"))) return { error: "SIRET invalide : 14 chiffres, vérifiez la saisie." };
      const userId = await ensureAccount(fd, "exposant");
      await companyIdentity(db, userId, { name: str(fd, "name"), siret: str(fd, "siret"), sector: str(fd, "sector"), size: str(fd, "size") });
      next = "/inscription/entreprise?etape=2";
    } else {
      const company = await getCurrentCompany();
      if (!company) return { error: "Session expirée : reconnectez-vous." };
      if (step === 2) {
        const brochure = await readUpload(file(fd, "brochure"), ["pdf", "ppt", "pptx"]);
        await companyWeb(db, company, { website: str(fd, "website"), linkedin: str(fd, "linkedin"), brochure });
        next = "/inscription/entreprise?etape=3";
      } else if (step === 3) {
        const names = fd.getAll("ref_name").map(String);
        const titles = fd.getAll("ref_title").map(String);
        const phones = fd.getAll("ref_phone").map(String);
        await companyReferents(
          db,
          company,
          names.map((name, i) => ({ name, title: titles[i] ?? "", phone: phones[i] ?? "" })),
        );
        next = "/inscription/entreprise?etape=4";
      } else {
        const mode = str(fd, "mode") as "excel" | "crm" | "standard";
        let columns = str(fd, "columns")
          .split(/[\n;,]/)
          .map((c) => c.trim())
          .filter(Boolean);
        const template = await readUpload(file(fd, "template"), ["xlsx"]);
        if (template) columns = (await parseLeadWorkbook(template.data)).headers;
        await companyLeadFormat(db, company, { mode, columns, crmProvider: str(fd, "crmProvider") || "HubSpot", crmAdminEmail: str(fd, "crmAdminEmail") });
        next = "/entreprise?bienvenue=1";
      }
    }
  } catch (e) {
    return fail(e);
  }
  redirect(next);
}

export async function freelancerStep(step: number, _: FormState, fd: FormData): Promise<FormState> {
  let next = "";
  try {
    const db = await getDb();
    if (step === 1) {
      if (!str(fd, "city")) return { error: "Indiquez votre ville." };
      const userId = await ensureAccount(fd, "commercial");
      await freelancerIdentity(db, userId, {
        firstName: str(fd, "firstName"),
        lastName: str(fd, "lastName"),
        phone: str(fd, "phone"),
        city: str(fd, "city"),
        bio: str(fd, "bio"),
      });
      next = "/inscription/commercial?etape=2";
    } else {
      const f = await getCurrentFreelancer();
      if (!f) return { error: "Session expirée : reconnectez-vous." };
      if (step === 2) {
        await freelancerProfile(db, f, {
          roles: strs(fd, "roles"),
          specialties: [...strs(fd, "specialties"), ...(str(fd, "otherSpecialty") ? [str(fd, "otherSpecialty")] : [])],
          languages: strs(fd, "languages"),
          otherLanguage: str(fd, "otherLanguage"),
          hourlyRateCents: eurosToCents(str(fd, "rate")),
        });
        next = "/inscription/commercial?etape=3";
      } else if (step === 3) {
        await freelancerSizes(db, f, { top: str(fd, "top"), pants: str(fd, "pants"), shoe: str(fd, "shoe") });
        next = "/inscription/commercial?etape=4";
      } else {
        for (const type of ["identite", "urssaf", "rib", "siret"] as DocumentKey[]) {
          const upload = await readUpload(file(fd, `doc_${type}`), ["pdf", "jpg", "jpeg", "png"]);
          if (upload) await uploadFreelancerDocument(db, f, type, upload);
        }
        await freelancerStatusStep(db, f, { siret: str(fd, "siret"), legalStatus: str(fd, "legalStatus") });
        next = "/commercial?bienvenue=1";
      }
    }
  } catch (e) {
    return fail(e);
  }
  redirect(next);
}
