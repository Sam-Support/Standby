import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import type Stripe from "stripe";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import type { DocumentKey } from "@/lib/domain";
import { daysUntil, longDate, todayIso } from "@/lib/format";
import { lookupSiret } from "@/lib/integrations/sirene";
import { audit, notify } from "@/lib/notify";

/** Une attestation de vigilance URSSAF vaut 6 mois à compter de sa délivrance. */
export const URSSAF_VALIDITY_MONTHS = 6;
export const REQUIRED_DOCUMENTS: DocumentKey[] = ["identite", "urssaf", "rib"];

export const SIRET_LABELS: Record<string, string> = {
  actif: "actif dans SIRENE",
  ferme: "établissement fermé",
  introuvable: "introuvable dans SIRENE",
  inconnu: "contrôle SIRENE en attente",
};

export function urssafValidUntil(issuedOn: string): string {
  const d = new Date(`${issuedOn}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + URSSAF_VALIDITY_MONTHS);
  if (d.getUTCDate() < day) d.setUTCDate(0); // 31 août + 6 mois → 28/29 février
  return d.toISOString().slice(0, 10);
}

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim();

/** Le nom SIRENE d'une entreprise individuelle contient-il le prénom et le nom du compte ? */
export function siretNameMatches(siretName: string | null | undefined, firstName: string, lastName: string) {
  if (!siretName) return false;
  const words = new Set(norm(siretName).split(" "));
  return [firstName, lastName].every((part) => norm(part).split(" ").filter(Boolean).every((w) => words.has(w)));
}

export type SiretLookup = typeof lookupSiret;

/**
 * Interroge SIRENE et enregistre le résultat. Renvoie le statut :
 * actif, ferme, introuvable, ou inconnu (API injoignable : le contrôle sera refait par la tâche planifiée).
 */
export async function checkFreelancerSiret(db: Db, freelancerId: string, siret: string, lookup: SiretLookup = lookupSiret) {
  const res = await lookup(siret);
  const status = res === null ? "inconnu" : !res.found ? "introuvable" : res.active ? "actif" : "ferme";
  await db
    .update(s.freelancers)
    .set({ siretStatus: status, siretName: res?.name ?? null, siretCheckedAt: res === null ? null : new Date() })
    .where(eq(s.freelancers.id, freelancerId));
  return { status, name: res?.name ?? null };
}

/** Recalcule le motif de retrait du matching (vide = profil visible). */
export async function refreshBlockedReason(db: Db, freelancerId: string, today = todayIso()) {
  const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, freelancerId));
  if (!f) return null;
  const [urssaf] = await db
    .select()
    .from(s.freelancerDocuments)
    .where(and(eq(s.freelancerDocuments.freelancerId, f.id), eq(s.freelancerDocuments.type, "urssaf")));
  const reasons: string[] = [];
  if (urssaf?.validUntil && urssaf.validUntil < today) reasons.push(`Attestation URSSAF expirée le ${longDate(urssaf.validUntil)}`);
  if (f.siretStatus === "ferme") reasons.push("Établissement fermé selon le répertoire SIRENE");
  const reason = reasons.join(" · ") || null;
  if (reason !== f.blockedReason) await db.update(s.freelancers).set({ blockedReason: reason }).where(eq(s.freelancers.id, f.id));
  return reason;
}

/** Profil validé dès que identité, attestation URSSAF (en cours de validité) et RIB sont acceptés. */
export async function maybeValidateFreelancer(db: Db, freelancerId: string, today = todayIso()) {
  const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, freelancerId));
  if (!f || f.status === "valide" || f.onboardingStep < 5) return false;
  const docs = await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, f.id));
  const ok = REQUIRED_DOCUMENTS.every((t) => docs.some((d) => d.type === t && d.status === "valide"));
  const urssaf = docs.find((d) => d.type === "urssaf");
  if (!ok || !urssaf?.validUntil || urssaf.validUntil < today || f.siretStatus === "ferme" || f.siretStatus === "introuvable") return false;
  await db.update(s.freelancers).set({ status: "valide" }).where(eq(s.freelancers.id, f.id));
  await notify(db, f.userId, {
    title: "Votre profil est validé",
    body: "Vos documents sont vérifiés : votre profil est visible des exposants et vous recevrez vos premières missions.",
    link: "/commercial",
  });
  return true;
}

/** Ce que Stripe a vérifié sur un compte Connect : identité de la personne, compte bancaire. */
export function stripeVerification(account: Pick<Stripe.Account, "individual" | "payouts_enabled" | "external_accounts">) {
  const identity = account.individual?.verification?.status === "verified";
  const bank = Boolean(account.payouts_enabled) && (account.external_accounts?.data?.length ?? 0) > 0;
  return { identity, bank };
}

/** Valide automatiquement la pièce d'identité et le RIB quand Stripe les a vérifiés. */
export async function applyStripeVerification(db: Db, freelancerId: string, v: { identity: boolean; bank: boolean }) {
  const done: DocumentKey[] = [];
  for (const [type, verified] of [
    ["identite", v.identity],
    ["rib", v.bank],
  ] as [DocumentKey, boolean][]) {
    if (!verified) continue;
    const [doc] = await db
      .select()
      .from(s.freelancerDocuments)
      .where(and(eq(s.freelancerDocuments.freelancerId, freelancerId), eq(s.freelancerDocuments.type, type)));
    if (doc?.status === "valide") continue;
    const values = { status: "valide" as const, comment: "Vérifié par Stripe", reviewedAt: new Date(), reviewedBy: null };
    if (doc) await db.update(s.freelancerDocuments).set(values).where(eq(s.freelancerDocuments.id, doc.id));
    else
      await db.insert(s.freelancerDocuments).values({
        freelancerId,
        type,
        path: null,
        filename: type === "identite" ? "Identité vérifiée par Stripe" : "Compte bancaire vérifié par Stripe",
        source: "stripe",
        ...values,
      });
    done.push(type);
  }
  if (done.length) {
    await audit(db, null, "documents.stripe_verified", "freelancer", freelancerId, { types: done });
    await maybeValidateFreelancer(db, freelancerId);
  }
  return done;
}

/**
 * Tâche planifiée :
 * - relances 30 et 7 jours avant l'échéance de l'attestation URSSAF, puis retrait du matching à l'échéance ;
 * - nouveau contrôle SIRENE tous les 30 jours (20 profils par passage, pour ménager l'API publique).
 */
export async function checkCompliance(db: Db, today = todayIso(), lookup: SiretLookup = lookupSiret) {
  let reminders = 0;
  const docs = await db
    .select({ d: s.freelancerDocuments, f: s.freelancers })
    .from(s.freelancerDocuments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.freelancerDocuments.freelancerId))
    .where(and(eq(s.freelancerDocuments.type, "urssaf"), isNotNull(s.freelancerDocuments.validUntil)));
  const admins = await db.select({ id: s.profiles.id }).from(s.profiles).where(eq(s.profiles.role, "admin"));
  for (const { d, f } of docs) {
    const left = daysUntil(d.validUntil!, today);
    const kind = left < 0 ? "expiree" : left <= 7 ? "j7" : left <= 30 ? "j30" : null;
    if (kind) {
      const [claimed] = await db
        .insert(s.documentReminders)
        .values({ documentId: d.id, kind: `${kind}:${d.validUntil}` })
        .onConflictDoNothing()
        .returning();
      if (claimed) {
        reminders++;
        await notify(db, f.userId, {
          title: kind === "expiree" ? "Attestation URSSAF expirée : profil suspendu" : `Votre attestation URSSAF expire dans ${left} jour${left > 1 ? "s" : ""}`,
          body:
            kind === "expiree"
              ? `Votre attestation a expiré le ${longDate(d.validUntil!)}. Vous ne recevez plus de missions tant qu’une attestation à jour n’est pas validée. Téléchargez-la sur urssaf.fr puis déposez-la dans votre profil.`
              : `Elle expire le ${longDate(d.validUntil!)}. Téléchargez une attestation de vigilance à jour sur urssaf.fr et déposez-la dans votre profil pour continuer à recevoir des missions.`,
          link: "/commercial/profil",
        });
        if (kind === "expiree") {
          for (const a of admins) {
            await notify(db, a.id, { title: "Attestation URSSAF expirée", body: "Un commercial est retiré du matching.", link: "/admin/inscrits?tous=1", email: false });
          }
        }
      }
    }
    await refreshBlockedReason(db, f.id, today);
  }

  const limit = new Date(new Date(`${today}T12:00:00Z`).getTime() - 30 * 86_400_000);
  const due = await db
    .select()
    .from(s.freelancers)
    .where(
      and(
        inArray(s.freelancers.status, ["valide", "en_revue"]),
        isNotNull(s.freelancers.siret),
        or(isNull(s.freelancers.siretCheckedAt), lt(s.freelancers.siretCheckedAt, limit)),
      ),
    )
    .orderBy(sql`${s.freelancers.siretCheckedAt} asc nulls first`) // jamais contrôlés, puis les plus anciens
    .limit(20);
  let rechecked = 0;
  for (const f of due) {
    const before = f.siretStatus;
    const { status } = await checkFreelancerSiret(db, f.id, f.siret!, lookup);
    if (status === "inconnu") continue;
    rechecked++;
    if (status === "ferme" && before !== "ferme") {
      for (const a of admins) {
        await notify(db, a.id, { title: "Établissement fermé (SIRENE)", body: "Un commercial est retiré du matching.", link: "/admin/inscrits?tous=1", email: false });
      }
      await notify(db, f.userId, {
        title: "Votre SIRET apparaît comme fermé",
        body: "Le répertoire SIRENE indique que votre établissement est fermé : vous ne recevez plus de missions. Contactez-nous si c’est une erreur.",
        link: "/contact",
      });
    }
    await refreshBlockedReason(db, f.id, today);
  }
  return { reminders, rechecked };
}
