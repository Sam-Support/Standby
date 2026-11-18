import { stripeEnabled } from "@/lib/integrations/stripe";

/**
 * Mode de paiement de la plateforme.
 *
 * PAYMENT_MODE=manuel : aucun appel à Stripe pour l'argent. Pas de moyen de paiement à enregistrer, pas de débit
 * automatique, pas de virement Connect, pas de remboursement en ligne. Les factures et autofactures sont toujours
 * émises ; l'équipe Stand-By fait les contrats, encaisse par virement et paie les commerciaux à la main, puis le
 * note dans l'administration (« Paiement reçu », « Virement fait », « Remboursé par virement »). Chaque étape
 * importante est envoyée à SUPPORT_EMAIL (lib/team-mail.ts).
 *
 * Sans cette variable, le comportement est celui de Stripe (ou simulé sans clé, en local et en test).
 */
export function manualPayments(): boolean {
  return process.env.PAYMENT_MODE === "manuel";
}

/** Paiement en ligne par Stripe : clé présente et mode manuel désactivé. */
export function onlinePayments(): boolean {
  return stripeEnabled() && !manualPayments();
}
