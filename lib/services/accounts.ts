import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { AuthError, createIdentity, storeLocalPassword, updateIdentityPassword, verifyIdentity } from "@/lib/auth/provider";
import { randomToken, signToken } from "@/lib/crypto";
import { AVATAR_COLORS, DOCUMENT_TYPES, isRoleKey, LANGUAGES, SPECIALTIES, type DocumentKey, type RoleKey } from "@/lib/domain";
import { hourly } from "@/lib/format";
import { sendEmail } from "@/lib/integrations/email";
import { lookupSiret } from "@/lib/integrations/sirene";
import { createConnectedAccount, onboardingLink, stripeEnabled } from "@/lib/integrations/stripe";
import { audit, notify } from "@/lib/notify";
import { getPricing } from "@/lib/settings";
import { isValidSiret, normalizeSiret } from "@/lib/siret";
import { putFile } from "@/lib/storage";

export class AccountError extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAccount(
  db: Db,
  input: { email: string; password: string; role: "exposant" | "commercial"; firstName: string; lastName: string; phone?: string },
) {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new AccountError("Adresse e-mail invalide.");
  if (input.password.length < 10) throw new AccountError("Le mot de passe doit contenir au moins 10 caractères.");
  if (!input.firstName.trim() || !input.lastName.trim()) throw new AccountError("Indiquez votre prénom et votre nom.");
  const [exists] = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.email, email));
  if (exists) throw new AccountError("Un compte existe déjà avec cet e-mail. Connectez-vous.");
  let id: string;
  try {
    id = await createIdentity(email, input.password);
  } catch (e) {
    throw new AccountError(e instanceof AuthError ? e.message : "Création du compte impossible.");
  }
  const [profile] = await db
    .insert(s.profiles)
    .values({ id, email, role: input.role, firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone: input.phone?.trim() || null })
    .returning();
  await storeLocalPassword(id, input.password);
  return profile;
}

export async function login(db: Db, email: string, password: string) {
  const id = await verifyIdentity(email.trim().toLowerCase(), password);
  if (!id) return null;
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, id));
  return p ?? null;
}

export async function requestPasswordReset(db: Db, email: string) {
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.email, email.trim().toLowerCase()));
  if (!p) return; // réponse identique, que le compte existe ou non
  const token = randomToken();
  await db.insert(s.passwordResets).values({ token, userId: p.id, expiresAt: new Date(Date.now() + 3600_000) });
  await sendEmail({
    to: p.email,
    subject: "Réinitialiser votre mot de passe standby",
    text: "Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.",
    link: { label: "Choisir un nouveau mot de passe", href: `/reinitialiser/${token}` },
  });
}

export async function resetPassword(db: Db, token: string, password: string) {
  if (password.length < 10) throw new AccountError("Le mot de passe doit contenir au moins 10 caractères.");
  const [r] = await db
    .select()
    .from(s.passwordResets)
    .where(and(eq(s.passwordResets.token, token), isNull(s.passwordResets.usedAt), gt(s.passwordResets.expiresAt, new Date())));
  if (!r) throw new AccountError("Lien expiré ou déjà utilisé. Faites une nouvelle demande.");
  await updateIdentityPassword(r.userId, password);
  await db.update(s.passwordResets).set({ usedAt: new Date() }).where(eq(s.passwordResets.token, token));
}

// ——— Entreprise ———

export async function companyIdentity(
  db: Db,
  ownerId: string,
  input: { name: string; siret: string; sector: string; size: string },
) {
  const siret = normalizeSiret(input.siret);
  if (!input.name.trim()) throw new AccountError("Indiquez la raison sociale.");
  if (!isValidSiret(siret)) throw new AccountError("SIRET invalide : 14 chiffres, vérifiez la saisie.");
  const check = await lookupSiret(siret);
  if (check && !check.found) throw new AccountError("Ce SIRET est introuvable dans le répertoire SIRENE.");
  const values = {
    name: input.name.trim(),
    siret,
    siretVerified: Boolean(check?.found && check.active),
    sector: input.sector.trim() || null,
    size: input.size || null,
  };
  const [existing] = await db.select().from(s.companies).where(eq(s.companies.ownerId, ownerId));
  if (existing) {
    await db.update(s.companies).set({ ...values, onboardingStep: Math.max(existing.onboardingStep, 2) }).where(eq(s.companies.id, existing.id));
    return existing.id;
  }
  const [c] = await db.insert(s.companies).values({ ownerId, ...values, onboardingStep: 2 }).returning();
  return c.id;
}

function cleanUrl(v: string) {
  const t = v.trim();
  if (!t) return null;
  const url = /^https?:\/\//.test(t) ? t : `https://${t}`;
  try {
    return new URL(url).toString();
  } catch {
    throw new AccountError(`Adresse web invalide : ${t}`);
  }
}

export async function companyWeb(db: Db, company: typeof s.companies.$inferSelect, input: { website: string; linkedin: string; brochure?: { data: Buffer; name: string } | null }) {
  let brochure = {};
  if (input.brochure) {
    const key = `private/companies/${company.id}/plaquette-${Date.now()}.${input.brochure.name.split(".").pop()}`;
    await putFile(key, input.brochure.data, input.brochure.name);
    brochure = { brochurePath: key, brochureName: input.brochure.name };
  }
  await db
    .update(s.companies)
    .set({ website: cleanUrl(input.website), linkedin: cleanUrl(input.linkedin), ...brochure, onboardingStep: Math.max(company.onboardingStep, 3) })
    .where(eq(s.companies.id, company.id));
}

export async function companyReferents(db: Db, company: typeof s.companies.$inferSelect, referents: { name: string; title: string; phone: string }[]) {
  const list = referents.filter((r) => r.name.trim());
  if (list.length === 0) throw new AccountError("Ajoutez au moins un référent.");
  const existing = await db.select().from(s.companyReferents).where(eq(s.companyReferents.companyId, company.id));
  // les référents déjà utilisés par une réservation sont conservés
  const used = new Set(
    (await db.select({ id: s.bookings.referentId }).from(s.bookings).where(eq(s.bookings.companyId, company.id))).map((b) => b.id),
  );
  for (const r of existing) if (!used.has(r.id)) await db.delete(s.companyReferents).where(eq(s.companyReferents.id, r.id));
  const kept = existing.filter((r) => used.has(r.id)).map((r) => r.name);
  await db.insert(s.companyReferents).values(
    list.filter((r) => !kept.includes(r.name.trim())).map((r) => ({ companyId: company.id, name: r.name.trim(), title: r.title.trim() || null, phone: r.phone.trim() || null })),
  );
  await db.update(s.companies).set({ onboardingStep: Math.max(company.onboardingStep, 4) }).where(eq(s.companies.id, company.id));
}

export async function companyLeadFormat(
  db: Db,
  company: typeof s.companies.$inferSelect,
  input: { mode: "excel" | "crm" | "standard"; columns: string[]; crmProvider?: string; crmAdminEmail?: string },
) {
  if (input.mode === "excel") {
    const columns = [...new Set(input.columns.map((c) => c.trim()).filter(Boolean))].slice(0, 40);
    if (columns.length < 2) throw new AccountError("Déposez votre template Excel ou listez au moins deux colonnes.");
    const [tpl] = await db.select().from(s.leadTemplates).where(eq(s.leadTemplates.companyId, company.id));
    if (tpl) await db.update(s.leadTemplates).set({ columns }).where(eq(s.leadTemplates.id, tpl.id));
    else await db.insert(s.leadTemplates).values({ companyId: company.id, name: `Template Excel ${company.name}`, columns });
  }
  if (input.mode === "crm") {
    const adminEmail = input.crmAdminEmail?.trim().toLowerCase() ?? "";
    if (!EMAIL.test(adminEmail)) throw new AccountError("Indiquez l’e-mail de l’administrateur CRM.");
    if ((input.crmProvider ?? "HubSpot") !== "HubSpot") throw new AccountError("Seul HubSpot est connecté pour l’instant.");
    await db
      .insert(s.crmConnections)
      .values({ companyId: company.id, provider: "HubSpot", status: "en_attente" })
      .onConflictDoNothing();
    const token = signToken({ companyId: company.id, purpose: "crm" }, 7 * 24 * 3600);
    await sendEmail({
      to: adminEmail,
      subject: `${company.name} vous demande de connecter HubSpot à standby`,
      text: `${company.name} utilise standby pour staffer ses salons. Les leads collectés sur le stand peuvent être créés directement dans HubSpot.\n\nL’accès demandé est limité à la création et la lecture de contacts. Ce lien est valable 7 jours.`,
      link: { label: "Connecter HubSpot", href: `/crm/connexion/${token}` },
    });
  }
  await db
    .update(s.companies)
    .set({ leadMode: input.mode, crmProvider: input.mode === "crm" ? "HubSpot" : null, crmAdminEmail: input.mode === "crm" ? input.crmAdminEmail!.trim() : null, onboardingStep: 5 })
    .where(eq(s.companies.id, company.id));
}

// ——— Commercial·e ———

export async function freelancerIdentity(db: Db, userId: string, input: { firstName: string; lastName: string; phone: string; city: string; bio: string }) {
  if (!input.city.trim()) throw new AccountError("Indiquez votre ville.");
  await db
    .update(s.profiles)
    .set({ firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone: input.phone.trim() || null })
    .where(eq(s.profiles.id, userId));
  const [existing] = await db.select().from(s.freelancers).where(eq(s.freelancers.userId, userId));
  if (existing) {
    await db
      .update(s.freelancers)
      .set({ city: input.city.trim(), bio: input.bio.trim() || null, onboardingStep: Math.max(existing.onboardingStep, 2) })
      .where(eq(s.freelancers.id, existing.id));
    return existing.id;
  }
  const [f] = await db
    .insert(s.freelancers)
    .values({ userId, city: input.city.trim(), bio: input.bio.trim() || null, onboardingStep: 2, avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] })
    .returning();
  return f.id;
}

export async function freelancerProfile(
  db: Db,
  f: typeof s.freelancers.$inferSelect,
  input: { roles: string[]; specialties: string[]; languages: string[]; otherLanguage?: string; hourlyRateCents: number },
) {
  const roles = input.roles.filter(isRoleKey) as RoleKey[];
  if (roles.length === 0) throw new AccountError("Choisissez au moins un poste.");
  const specialties = input.specialties.filter((x) => SPECIALTIES.includes(x) || x.trim().length > 1).slice(0, 8);
  if (specialties.length === 0) throw new AccountError("Choisissez au moins une spécialité.");
  const languages = [...input.languages.filter((l) => LANGUAGES.includes(l)), ...(input.otherLanguage?.trim() ? [input.otherLanguage.trim()] : [])];
  if (languages.length === 0) throw new AccountError("Choisissez au moins une langue.");
  const pricing = await getPricing(db);
  const floor = pricing.floors[roles[0]];
  if (!Number.isFinite(input.hourlyRateCents) || input.hourlyRateCents < floor) {
    throw new AccountError(`Tarif minimum pour ce poste : ${hourly(floor)}.`);
  }
  await db
    .update(s.freelancers)
    .set({ roles, specialties, languages, hourlyRateCents: Math.round(input.hourlyRateCents), onboardingStep: Math.max(f.onboardingStep, 3) })
    .where(eq(s.freelancers.id, f.id));
}

export async function freelancerSizes(db: Db, f: typeof s.freelancers.$inferSelect, input: { top: string; pants: string; shoe: string }) {
  await db
    .update(s.freelancers)
    .set({ topSize: input.top.trim() || null, pantsSize: input.pants.trim() || null, shoeSize: input.shoe.trim() || null, onboardingStep: Math.max(f.onboardingStep, 4) })
    .where(eq(s.freelancers.id, f.id));
}

export async function uploadFreelancerDocument(db: Db, f: typeof s.freelancers.$inferSelect, type: DocumentKey, file: { data: Buffer; name: string }) {
  const key = `private/freelancers/${f.id}/${type}-${Date.now()}.${file.name.split(".").pop()}`;
  await putFile(key, file.data, file.name);
  await db
    .insert(s.freelancerDocuments)
    .values({ freelancerId: f.id, type, path: key, filename: file.name })
    .onConflictDoUpdate({
      target: [s.freelancerDocuments.freelancerId, s.freelancerDocuments.type],
      set: { path: key, filename: file.name, status: "en_attente", comment: null, reviewedAt: null, reviewedBy: null },
    });
}

export async function freelancerStatusStep(db: Db, f: typeof s.freelancers.$inferSelect, input: { siret: string; legalStatus: string }) {
  const siret = normalizeSiret(input.siret);
  if (!isValidSiret(siret)) throw new AccountError("SIRET invalide : 14 chiffres, vérifiez la saisie.");
  const docs = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id));
  const missing = (["identite", "urssaf", "rib"] as DocumentKey[]).filter((t) => !docs.some((d) => d.type === t));
  if (missing.length) throw new AccountError(`Documents manquants : ${missing.map((t) => DOCUMENT_TYPES[t]).join(", ")}.`);
  await db
    .update(s.freelancers)
    .set({ siret, legalStatus: input.legalStatus || "Auto-entrepreneur", status: f.status === "valide" ? "valide" : "en_revue", onboardingStep: 5 })
    .where(eq(s.freelancers.id, f.id));
  if (f.status !== "valide") {
    const admins = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.role, "admin"));
    for (const a of admins) {
      await notify(db, a.id, { title: "Nouveau profil à vérifier", body: "Un commercial a transmis ses documents.", link: "/admin/inscrits", email: false });
    }
  }
}

export async function reviewDocument(db: Db, docId: string, adminId: string, status: "valide" | "refuse", comment?: string) {
  const [doc] = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.id, docId));
  if (!doc) throw new AccountError("Document introuvable.");
  await db
    .update(s.freelancerDocuments)
    .set({ status, comment: comment?.trim() || null, reviewedBy: adminId, reviewedAt: new Date() })
    .where(eq(s.freelancerDocuments.id, docId));
  await audit(db, adminId, `document.${status}`, "freelancer_document", docId, { comment });
  const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, doc.freelancerId));
  const docs = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id));
  const required: DocumentKey[] = ["identite", "urssaf", "rib"];
  const allValid = required.every((t) => docs.some((d) => d.type === t && d.status === "valide"));
  if (status === "refuse") {
    await notify(db, f.userId, {
      title: "Un document est à corriger",
      body: `${DOCUMENT_TYPES[doc.type as DocumentKey]} : ${comment?.trim() || "document refusé"}. Déposez une nouvelle version depuis votre profil.`,
      link: "/commercial/profil",
    });
  } else if (allValid && f.status !== "valide" && f.onboardingStep >= 5) {
    await db.update(s.freelancers).set({ status: "valide" }).where(eq(s.freelancers.id, f.id));
    await notify(db, f.userId, {
      title: "Votre profil est validé",
      body: "Vos documents sont vérifiés : votre profil est visible des exposants et vous recevrez vos premières missions.",
      link: "/commercial",
    });
  }
}

/** Lien d'onboarding Stripe Connect (identité + IBAN). En mode simulé, le compte est marqué prêt. */
export async function stripeOnboarding(db: Db, f: typeof s.freelancers.$inferSelect, email: string): Promise<string | null> {
  if (!stripeEnabled()) {
    await db.update(s.freelancers).set({ payoutsEnabled: true }).where(eq(s.freelancers.id, f.id));
    return null;
  }
  let accountId = f.stripeAccountId;
  if (!accountId) {
    accountId = await createConnectedAccount(email, f.id);
    await db.update(s.freelancers).set({ stripeAccountId: accountId }).where(eq(s.freelancers.id, f.id));
  }
  return onboardingLink(accountId);
}
