import Stripe from "stripe";
import { appUrl } from "./email";

/**
 * Stripe Connect. Sans STRIPE_SECRET_KEY, l'application fonctionne en mode simulé :
 * les paiements et virements sont marqués réussis sans appel externe.
 */
export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | undefined;
export function stripe(): Stripe {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

/** Compte Express pour un commercial, virements hebdomadaires le lundi. */
export async function createConnectedAccount(email: string, freelancerId: string): Promise<string> {
  const account = await stripe().accounts.create({
    type: "express",
    country: "FR",
    email,
    business_type: "individual",
    capabilities: { transfers: { requested: true } },
    settings: { payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } } },
    metadata: { freelancerId },
  });
  return account.id;
}

export async function onboardingLink(accountId: string): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl()}/commercial/profil?stripe=retry`,
    return_url: `${appUrl()}/commercial/profil?stripe=retour`,
  });
  return link.url;
}

export async function createCustomer(email: string, name: string, companyId: string): Promise<string> {
  const c = await stripe().customers.create({ email, name, metadata: { companyId } });
  return c.id;
}

/** Enregistrement du moyen de paiement (mandat SEPA ou carte) à la confirmation. */
export async function paymentMethodSession(customerId: string, bookingId: string, companyId: string): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    currency: "eur",
    allowed_payment_method_types: ["sepa_debit", "card"],
    success_url: `${appUrl()}/reserver/${bookingId}/confirmation?paiement=ok`,
    cancel_url: `${appUrl()}/reserver/${bookingId}/confirmation?paiement=annule`,
    metadata: { bookingId, companyId },
  });
  return session.url!;
}

export async function chargeCustomer(p: {
  customerId: string;
  paymentMethodId: string;
  amountCents: number;
  transferGroup: string;
  metadata: Record<string, string>;
}) {
  return stripe().paymentIntents.create({
    amount: p.amountCents,
    currency: "eur",
    customer: p.customerId,
    payment_method: p.paymentMethodId,
    off_session: true,
    confirm: true,
    transfer_group: p.transferGroup,
    metadata: p.metadata,
  });
}

export async function transferToFreelancer(p: { amountCents: number; accountId: string; transferGroup: string; sourceCharge?: string | null }) {
  return stripe().transfers.create({
    amount: p.amountCents,
    currency: "eur",
    destination: p.accountId,
    transfer_group: p.transferGroup,
    ...(p.sourceCharge ? { source_transaction: p.sourceCharge } : {}),
  });
}
