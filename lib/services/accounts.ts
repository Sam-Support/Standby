import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { AuthError, createIdentity, storeLocalPassword, updateIdentityEmail, updateIdentityPassword, verifyIdentity } from "@/lib/auth/provider";
import { randomToken, signToken, verifyToken } from "@/lib/crypto";
import { AVATAR_COLORS, DOCUMENT_TYPES, isRoleKey, LANGUAGES, SPECIALTIES, type DocumentKey, type RoleKey } from "@/lib/domain";
import { hourly } from "@/lib/format";
import { sendEmail } from "@/lib/integrations/email";
import { lookupSiret } from "@/lib/integrations/sirene";
import { createConnectedAccount, onboardingLink, stripeEnabled } from "@/lib/integrations/stripe";
import { audit, notify } from "@/lib/notify";
import { getPricing } from "@/lib/settings";
import { isValidSiret, normalizeSiret } from "@/lib/siret";
import { deleteFile, putFile } from "@/lib/storage";
import {
  checkFreelancerSiret,
  maybeValidateFreelancer,
  refreshBlockedReason,
  REQUIRED_DOCUMENTS,
  urssafValidUntil,
  type SiretLookup,
} from "./compliance";

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
  await storeLocalPassword(db, id, input.password);
  await sendVerificationEmail(db, profile);
  return profile;
}

const VERIFY_TTL = 48 * 3600;

/** Lien de confirmation d'adresse (48 h). Sans adresse confirmée : ni réservation, ni mission. */
export async function sendVerificationEmail(db: Db, profile: { id: string; email: string; firstName: string }) {
  const token = signToken({ uid: profile.id, email: profile.email, purpose: "verify" }, VERIFY_TTL);
  await sendEmail(
    {
      to: profile.email,
      subject: "Confirmez votre adresse e-mail standby",
      text: `Bonjour ${profile.firstName},\n\nConfirmez votre adresse pour pouvoir réserver une équipe ou accepter des missions. Ce lien est valable 48 heures.`,
      link: { label: "Confirmer mon adresse", href: `/verifier-email/${token}` },
    },
    db,
  );
}

export async function confirmEmail(db: Db, token: string) {
  const data = verifyToken<{ uid: string; email: string; purpose: string }>(token);
  if (!data || data.purpose !== "verify") throw new AccountError("Lien expiré ou invalide. Demandez un nouveau lien depuis votre espace.");
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, data.uid));
  if (!p || p.email !== data.email) throw new AccountError("Lien expiré ou invalide. Demandez un nouveau lien depuis votre espace.");
  if (!p.emailVerifiedAt) await db.update(s.profiles).set({ emailVerifiedAt: new Date() }).where(eq(s.profiles.id, p.id));
  return p;
}

export function requireVerifiedEmail(profile: { emailVerifiedAt: Date | null }) {
  if (!profile.emailVerifiedAt) {
    throw new AccountError("Confirmez d’abord votre adresse e-mail : le lien vous a été envoyé à l’inscription (vous pouvez le renvoyer depuis le bandeau en haut de page).");
  }
}

export async function login(db: Db, email: string, password: string) {
  const id = await verifyIdentity(db, email.trim().toLowerCase(), password);
  if (!id) return null;
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, id));
  return p ?? null;
}

export async function requestPasswordReset(db: Db, email: string) {
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.email, email.trim().toLowerCase()));
  if (!p) return; // réponse identique, que le compte existe ou non
  const token = randomToken();
  await db.insert(s.passwordResets).values({ token, userId: p.id, expiresAt: new Date(Date.now() + 3600_000) });
  await sendEmail(
    {
      to: p.email,
      subject: "Réinitialiser votre mot de passe standby",
      text: "Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.",
      link: { label: "Choisir un nouveau mot de passe", href: `/reinitialiser/${token}` },
    },
    db,
  );
}

export async function resetPassword(db: Db, token: string, password: string) {
  if (password.length < 10) throw new AccountError("Le mot de passe doit contenir au moins 10 caractères.");
  const [r] = await db
    .select()
    .from(s.passwordResets)
    .where(and(eq(s.passwordResets.token, token), isNull(s.passwordResets.usedAt), gt(s.passwordResets.expiresAt, new Date())));
  if (!r) throw new AccountError("Lien expiré ou déjà utilisé. Faites une nouvelle demande.");
  await updateIdentityPassword(db, r.userId, password);
  await db.update(s.passwordResets).set({ usedAt: new Date() }).where(eq(s.passwordResets.token, token));
  await bumpSessionVersion(db, r.userId);
}

/** Ferme toutes les sessions ouvertes du compte ; renvoie la nouvelle version pour rouvrir la session courante. */
async function bumpSessionVersion(db: Db, userId: string) {
  const [p] = await db
    .update(s.profiles)
    .set({ sessionVersion: sql`${s.profiles.sessionVersion} + 1` })
    .where(eq(s.profiles.id, userId))
    .returning({ v: s.profiles.sessionVersion });
  return p.v;
}

type AccountUser = { id: string; email: string; firstName: string };

async function assertPassword(db: Db, user: AccountUser, password: string, message: string) {
  if ((await verifyIdentity(db, user.email, password)) !== user.id) throw new AccountError(message);
}

/** Changement de mot de passe depuis le compte : l'actuel est exigé, les autres appareils sont déconnectés. */
export async function changePassword(db: Db, user: AccountUser, current: string, next: string) {
  if (next.length < 10) throw new AccountError("Le nouveau mot de passe doit contenir au moins 10 caractères.");
  if (next === current) throw new AccountError("Choisissez un mot de passe différent de l’actuel.");
  await assertPassword(db, user, current, "Mot de passe actuel incorrect.");
  await updateIdentityPassword(db, user.id, next);
  const version = await bumpSessionVersion(db, user.id);
  await sendEmail(
    {
      to: user.email,
      subject: "Votre mot de passe standby a été modifié",
      text: `Bonjour ${user.firstName},\n\nLe mot de passe de votre compte vient d’être modifié et vos autres appareils ont été déconnectés. Si vous n’êtes pas à l’origine de ce changement, réinitialisez-le immédiatement et contactez-nous.`,
      link: { label: "Réinitialiser mon mot de passe", href: "/mot-de-passe-oublie" },
    },
    db,
  );
  await audit(db, user.id, "account.password_change", "profile", user.id);
  return version;
}

const EMAIL_CHANGE_TTL = 24 * 3600;

/**
 * Changement d'adresse : lien de confirmation envoyé à la nouvelle adresse (24 h), alerte sur l'ancienne.
 * L'ancienne adresse reste l'identifiant tant que la nouvelle n'est pas confirmée.
 */
export async function requestEmailChange(db: Db, user: AccountUser, newEmail: string, password: string) {
  const email = newEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new AccountError("Adresse e-mail invalide.");
  if (email === user.email) throw new AccountError("C’est déjà l’adresse de votre compte.");
  await assertPassword(db, user, password, "Mot de passe incorrect.");
  const [taken] = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.email, email));
  if (taken) throw new AccountError("Cette adresse est déjà utilisée par un autre compte.");
  const token = signToken({ uid: user.id, from: user.email, to: email, purpose: "email-change" }, EMAIL_CHANGE_TTL);
  await sendEmail(
    {
      to: email,
      subject: "Confirmez votre nouvelle adresse standby",
      text: `Bonjour ${user.firstName},\n\nConfirmez cette adresse pour vous connecter à standby avec elle, à la place de ${user.email}. Ce lien est valable 24 heures.`,
      link: { label: "Confirmer ma nouvelle adresse", href: `/nouvelle-adresse/${token}` },
    },
    db,
  );
  await sendEmail(
    {
      to: user.email,
      subject: "Changement d’adresse e-mail demandé",
      text: `Bonjour ${user.firstName},\n\nUn changement d’adresse vers ${email} a été demandé depuis votre compte standby. Votre adresse actuelle reste valable tant que la nouvelle n’est pas confirmée. Si vous n’êtes pas à l’origine de cette demande, changez votre mot de passe et contactez-nous.`,
    },
    db,
  );
  await audit(db, user.id, "account.email_change_request", "profile", user.id, { to: email });
}

export async function confirmEmailChange(db: Db, token: string) {
  const data = verifyToken<{ uid: string; from: string; to: string; purpose: string }>(token);
  if (!data || data.purpose !== "email-change") throw new AccountError("Lien expiré ou invalide. Refaites la demande depuis votre compte.");
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.id, data.uid));
  if (!p || p.email !== data.from) throw new AccountError("Lien expiré ou déjà utilisé. Refaites la demande depuis votre compte.");
  const [taken] = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.email, data.to));
  if (taken) throw new AccountError("Cette adresse est déjà utilisée par un autre compte.");
  try {
    await updateIdentityEmail(p.id, data.to);
  } catch (e) {
    throw new AccountError(e instanceof AuthError ? e.message : "Mise à jour de l’adresse impossible.");
  }
  const [updated] = await db
    .update(s.profiles)
    .set({ email: data.to, emailVerifiedAt: new Date() })
    .where(eq(s.profiles.id, p.id))
    .returning();
  await sendEmail(
    {
      to: data.from,
      subject: "Adresse e-mail modifiée",
      text: `Bonjour ${p.firstName},\n\nVotre compte standby utilise désormais l’adresse ${data.to}. Si vous n’êtes pas à l’origine de ce changement, contactez-nous immédiatement.`,
    },
    db,
  );
  await audit(db, p.id, "account.email_change", "profile", p.id, { from: data.from, to: data.to });
  return updated;
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
    await sendEmail(
      {
        to: adminEmail,
        subject: `${company.name} vous demande de connecter HubSpot à standby`,
        text: `${company.name} utilise standby pour staffer ses salons. Les leads collectés sur le stand peuvent être créés directement dans HubSpot.\n\nL’accès demandé est limité à la création et la lecture de contacts. Ce lien est valable 7 jours.`,
        link: { label: "Connecter HubSpot", href: `/crm/connexion/${token}` },
      },
      db,
    );
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Dépôt d'un document. Pour l'attestation URSSAF, la date de délivrance est obligatoire : l'échéance
 * (6 mois) n'est enregistrée qu'à la validation, l'ancienne attestation restant valable d'ici là.
 */
export async function uploadFreelancerDocument(
  db: Db,
  f: typeof s.freelancers.$inferSelect,
  type: DocumentKey,
  file: { data: Buffer; name: string },
  issuedOn?: string | null,
  today = new Date().toISOString().slice(0, 10),
) {
  if (type === "urssaf") {
    if (!issuedOn || !ISO_DATE.test(issuedOn)) throw new AccountError("Indiquez la date de délivrance de l’attestation URSSAF.");
    if (issuedOn > today) throw new AccountError("La date de délivrance de l’attestation ne peut pas être dans le futur.");
    if (urssafValidUntil(issuedOn) < today) {
      throw new AccountError("Cette attestation a plus de 6 mois : téléchargez une attestation de vigilance à jour sur urssaf.fr.");
    }
  }
  const key = `private/freelancers/${f.id}/${type}-${Date.now()}.${file.name.split(".").pop()}`;
  await putFile(key, file.data, file.name);
  const [previous] = await db
    .select({ path: s.freelancerDocuments.path })
    .from(s.freelancerDocuments)
    .where(and(eq(s.freelancerDocuments.freelancerId, f.id), eq(s.freelancerDocuments.type, type)));
  await db
    .insert(s.freelancerDocuments)
    .values({ freelancerId: f.id, type, path: key, filename: file.name, issuedOn: issuedOn ?? null })
    .onConflictDoUpdate({
      target: [s.freelancerDocuments.freelancerId, s.freelancerDocuments.type],
      set: { path: key, filename: file.name, source: "depot", issuedOn: issuedOn ?? null, status: "en_attente", comment: null, reviewedAt: null, reviewedBy: null },
    });
  if (previous?.path && previous.path !== key) await deleteFile(previous.path);
}

export async function freelancerStatusStep(
  db: Db,
  f: typeof s.freelancers.$inferSelect,
  input: { siret: string; legalStatus: string },
  lookup?: SiretLookup,
) {
  const siret = normalizeSiret(input.siret);
  if (!isValidSiret(siret)) throw new AccountError("SIRET invalide : 14 chiffres, vérifiez la saisie.");
  const docs = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id));
  const missing = REQUIRED_DOCUMENTS.filter((t) => !docs.some((d) => d.type === t));
  if (missing.length) throw new AccountError(`Documents manquants : ${missing.map((t) => DOCUMENT_TYPES[t]).join(", ")}.`);
  const sirene = await checkFreelancerSiret(db, f.id, siret, lookup);
  if (sirene.status === "introuvable") throw new AccountError("Ce SIRET est introuvable dans le répertoire SIRENE : vérifiez la saisie.");
  if (sirene.status === "ferme") throw new AccountError("Ce SIRET correspond à un établissement fermé dans le répertoire SIRENE.");
  await db
    .update(s.freelancers)
    .set({ siret, legalStatus: input.legalStatus || "Auto-entrepreneur", status: f.status === "valide" ? "valide" : "en_revue", onboardingStep: 5 })
    .where(eq(s.freelancers.id, f.id));
  if (f.status !== "valide" && !(await maybeValidateFreelancer(db, f.id))) {
    const admins = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.role, "admin"));
    for (const a of admins) {
      await notify(db, a.id, { title: "Nouveau profil à vérifier", body: "Un commercial a transmis ses documents.", link: "/admin/inscrits", email: false });
    }
  }
}

/** Validation ou refus d'un document par l'équipe Standby (date de délivrance corrigeable pour l'URSSAF). */
export async function reviewDocument(
  db: Db,
  docId: string,
  adminId: string,
  status: "valide" | "refuse",
  comment?: string,
  issuedOn?: string | null,
  today = new Date().toISOString().slice(0, 10),
) {
  const [doc] = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.id, docId));
  if (!doc) throw new AccountError("Document introuvable.");
  let dates = {};
  if (status === "valide" && doc.type === "urssaf") {
    const issued = issuedOn || doc.issuedOn;
    if (!issued || !ISO_DATE.test(issued)) throw new AccountError("Indiquez la date de délivrance de l’attestation pour la valider.");
    const validUntil = urssafValidUntil(issued);
    if (validUntil < today) throw new AccountError(`Cette attestation a expiré le ${validUntil} : refusez-la et demandez-en une à jour.`);
    dates = { issuedOn: issued, validUntil };
  }
  await db
    .update(s.freelancerDocuments)
    .set({ status, comment: comment?.trim() || null, reviewedBy: adminId, reviewedAt: new Date(), ...dates })
    .where(eq(s.freelancerDocuments.id, docId));
  await audit(db, adminId, `document.${status}`, "freelancer_document", docId, { comment, ...dates });
  const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, doc.freelancerId));
  await refreshBlockedReason(db, f.id, today);
  if (status === "refuse") {
    await notify(db, f.userId, {
      title: "Un document est à corriger",
      body: `${DOCUMENT_TYPES[doc.type as DocumentKey]} : ${comment?.trim() || "document refusé"}. Déposez une nouvelle version depuis votre profil.`,
      link: "/commercial/profil",
    });
  } else {
    await maybeValidateFreelancer(db, f.id, today);
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
