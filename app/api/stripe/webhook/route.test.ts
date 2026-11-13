import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Signature des webhooks : deux destinations (votre compte, comptes connectés), donc deux secrets possibles

const signed = (payload: object, secret: string) => {
  const body = JSON.stringify(payload);
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": header } });
};
const event = (livemode: boolean) => ({ id: "evt_test", object: "event", type: "account.updated", livemode, data: { object: { id: "acct_test" } } });

describe("webhook Stripe", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("répond 404 tant que Stripe n'est pas configuré", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await POST(signed(event(false), "whsec_a"))).status).toBe(404);
  });

  it("refuse une signature qui ne correspond à aucun secret", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_compte");
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_connect");
    expect((await POST(signed(event(false), "whsec_autre"))).status).toBe(400);
  });

  it("accepte le secret de la destination « Comptes connectés » et ignore les événements de l'autre mode", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_compte");
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_connect");
    const res = await POST(signed(event(true), "whsec_connect")); // événement réel reçu avec une clé de test
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, ignored: "autre mode" });
    const viaCompte = await POST(signed(event(true), "whsec_compte"));
    expect(await viaCompte.json()).toEqual({ received: true, ignored: "autre mode" });
  });
});
