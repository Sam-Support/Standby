import { fmt } from "@/lib/format";
import type { Lang } from "@/lib/i18n/config";

/**
 * Commission des commerciaux, fixée par l'entreprise dans son offre :
 * - « lead » : un montant par lead qualifié (les leads remontés par le commercial, nombre retenu par l'entreprise) ;
 * - « vente » : un pourcentage des ventes HT réalisées sur le stand (montant déclaré par l'entreprise).
 * Elle s'ajoute au taux horaire, apparaît sur la facture (frais de service compris) et sur la paie du commercial.
 */

export type CommissionType = "aucune" | "lead" | "vente";
export type CommissionTerms = { commissionType: string; commissionLeadCents: number; commissionSaleBps: number };

export const COMMISSION_LIMITS = { minLeadCents: 50, maxLeadCents: 50_000, minSaleBps: 50, maxSaleBps: 5_000 };

export function isCommissionType(v: string): v is CommissionType {
  return v === "aucune" || v === "lead" || v === "vente";
}

/** Montant de la commission d'un commercial, en centimes. */
export function commissionFor(terms: CommissionTerms, result: { qualifiedLeads: number | null; salesCents: number | null }): number {
  if (terms.commissionType === "lead") return Math.max(0, result.qualifiedLeads ?? 0) * terms.commissionLeadCents;
  if (terms.commissionType === "vente") return Math.round((Math.max(0, result.salesCents ?? 0) * terms.commissionSaleBps) / 10000);
  return 0;
}

/** « 5 € par lead qualifié », « 5 % des ventes réalisées sur le stand » ; null sans commission. */
export function commissionText(lang: Lang, terms: CommissionTerms): string | null {
  const f = fmt(lang);
  if (terms.commissionType === "lead" && terms.commissionLeadCents > 0) {
    const amount = f.eurosPrecise(terms.commissionLeadCents);
    return { fr: `${amount} par lead qualifié`, en: `${amount} per qualified lead`, es: `${amount} por lead cualificado` }[lang];
  }
  if (terms.commissionType === "vente" && terms.commissionSaleBps > 0) {
    const pct = f.percent(terms.commissionSaleBps);
    return { fr: `${pct} des ventes réalisées sur le stand`, en: `${pct} of sales made on the booth`, es: `${pct} de las ventas realizadas en el stand` }[lang];
  }
  return null;
}
