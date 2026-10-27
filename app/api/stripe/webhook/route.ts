import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb, schema as s } from "@/db";
import { stripe, stripeEnabled } from "@/lib/integrations/stripe";
import { audit } from "@/lib/notify";
import { markPaymentFailed, markPaymentSucceeded } from "@/lib/services/billing";
import { applyStripeVerification, stripeVerification } from "@/lib/services/compliance";

/** Webhook Stripe : moyen de paiement enregistré, paiement réussi/échoué, compte Connect prêt. */
export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) return new Response("Stripe non configuré", { status: 404 });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }
  const db = await getDb();
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "setup" && session.setup_intent && session.metadata?.companyId) {
          const si = await stripe().setupIntents.retrieve(typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent.id);
          const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
          if (pm) await db.update(s.companies).set({ stripePaymentMethodId: pm }).where(eq(s.companies.id, session.metadata.companyId));
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge?.id ?? null);
        if (pi.metadata?.paymentId) await markPaymentSucceeded(db, pi.metadata.paymentId, charge);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        if (pi.metadata?.paymentId) await markPaymentFailed(db, pi.metadata.paymentId, pi.last_payment_error?.message ?? "Paiement refusé");
        break;
      }
      case "account.updated": {
        const acct = event.data.object;
        await db.update(s.freelancers).set({ payoutsEnabled: Boolean(acct.payouts_enabled) }).where(eq(s.freelancers.stripeAccountId, acct.id));
        // identité et compte bancaire vérifiés par Stripe : pièce d'identité et RIB validés automatiquement
        const [f] = await db.select({ id: s.freelancers.id }).from(s.freelancers).where(eq(s.freelancers.stripeAccountId, acct.id));
        if (f) await applyStripeVerification(db, f.id, stripeVerification(acct));
        break;
      }
    }
  } catch (e) {
    await audit(db, null, "stripe.webhook_error", "stripe_event", event.id, { type: event.type, message: e instanceof Error ? e.message : String(e) });
    return new Response("Erreur de traitement", { status: 500 });
  }
  return Response.json({ received: true });
}
