import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { emailConfig, sendEmail } from "@/lib/integrations/email";
import { applyEmailEvent, verifyResendSignature } from "./emails";

// Envoi par Resend et suivi de remise (webhook signé Svix)

let db: Db;
beforeAll(async () => {
  db = await createPgliteDb(null, true);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("signature des webhooks", () => {
  // exemple publié dans la documentation Svix (vérification manuelle)
  const sample = {
    secret: "whsec_plJ3nmyCDGBKInavdOK15jsl",
    id: "msg_loFOjxBNrRLzqYUf",
    timestamp: "1731705121",
    body: '{"event_type":"ping","data":{"success":true}}',
    signature: "v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=",
  };
  const at = Number(sample.timestamp) * 1000;
  const headers = { id: sample.id, timestamp: sample.timestamp, signature: sample.signature };

  it("accepte la signature attendue, y compris parmi plusieurs", () => {
    expect(verifyResendSignature(sample.body, headers, sample.secret, at)).toBe(true);
    expect(verifyResendSignature(sample.body, { ...headers, signature: `v1,AAAA ${sample.signature}` }, sample.secret, at)).toBe(true);
  });

  it("refuse un corps modifié, un mauvais secret, un rejeu ou des en-têtes manquants", () => {
    expect(verifyResendSignature(sample.body.replace("true", "false"), headers, sample.secret, at)).toBe(false);
    expect(verifyResendSignature(sample.body, headers, "whsec_" + Buffer.from("autre").toString("base64"), at)).toBe(false);
    expect(verifyResendSignature(sample.body, headers, sample.secret, at + 10 * 60_000)).toBe(false);
    expect(verifyResendSignature(sample.body, { ...headers, signature: null }, sample.secret, at)).toBe(false);
  });
});

describe("envoi par Resend", () => {
  it("journalise l'envoi avec une clé d'idempotence, sans garder le lien en base", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Stand-By <notifications@exemple.fr>");
    vi.stubEnv("SUPPORT_EMAIL", "support@exemple.fr");
    const fetchMock = vi.fn(async () => Response.json({ id: "resend-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await sendEmail({ to: "a@exemple.fr", subject: "Bonjour", text: "Texte", link: { label: "Ouvrir", href: "/reinitialiser/secret" }, category: "compte" }, db);
    expect(res).toEqual({ status: "envoye", id: "resend-1" });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.from).toBe("Stand-By <notifications@exemple.fr>");
    expect(body.reply_to).toBe("support@exemple.fr");
    expect(body.tags).toEqual([{ name: "category", value: "compte" }]);
    expect(body.text).toMatch(/reinitialiser\/secret/);
    const [row] = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.providerId, "resend-1"));
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(row.id);
    expect(row).toMatchObject({ status: "envoye", link: null, category: "compte" });
  });

  it("réessaie après une erreur passagère, abandonne sur une erreur de requête", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("indisponible", { status: 503, headers: { "retry-after": "0" } })).mockResolvedValueOnce(Response.json({ id: "resend-2" })),
    );
    expect((await sendEmail({ to: "b@exemple.fr", subject: "S", text: "T" }, db)).status).toBe("envoye");
    const refused = vi.fn(async () => new Response('{"message":"domain not verified"}', { status: 403 }));
    vi.stubGlobal("fetch", refused);
    const res = await sendEmail({ to: "c@exemple.fr", subject: "S", text: "T" }, db);
    expect(res.status).toBe("echec");
    expect(refused).toHaveBeenCalledTimes(1);
    const [row] = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.to, "c@exemple.fr"));
    expect(row.status).toBe("echec");
    expect(row.error).toMatch(/403/);
  });

  it("signale une configuration incomplète", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    expect(emailConfig().problems.join(" ")).toMatch(/EMAIL_FROM manquant.*RESEND_WEBHOOK_SECRET/);
  });
});

describe("suivi de remise", () => {
  it("met à jour le journal sans revenir en arrière, marque puis libère l'adresse", async () => {
    const [p] = await db.select().from(s.profiles).where(eq(s.profiles.role, "exposant")).limit(1);
    await db.insert(s.emailOutbox).values({ to: p.email, subject: "S", text: "T", status: "envoye", providerId: "evt-1" });
    await applyEmailEvent(db, { type: "email.delivered", data: { email_id: "evt-1", to: [p.email] } });
    await applyEmailEvent(db, { type: "email.sent", data: { email_id: "evt-1", to: [p.email] } }); // arrivé en retard
    let [row] = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.providerId, "evt-1"));
    expect(row.status).toBe("delivre");

    await db.insert(s.emailOutbox).values({ to: p.email, subject: "S", text: "T", status: "envoye", providerId: "evt-2" });
    await applyEmailEvent(db, { type: "email.bounced", data: { email_id: "evt-2", to: [p.email], bounce: { type: "Transient", message: "boîte pleine" } } });
    [row] = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.providerId, "evt-2"));
    expect(row.status).toBe("differe");
    let [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, p.id));
    expect(profile.emailUndeliverableAt).toBeNull();

    await applyEmailEvent(db, { type: "email.bounced", data: { email_id: "evt-2", to: [p.email], bounce: { type: "Permanent", message: "adresse inconnue" } } });
    [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, p.id));
    expect(profile.emailUndeliverableAt).not.toBeNull();
    expect(profile.emailUndeliverableReason).toMatch(/rebond définitif : adresse inconnue/);

    await applyEmailEvent(db, { type: "email.delivered", data: { email_id: "evt-1", to: [p.email] } });
    [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, p.id));
    expect(profile.emailUndeliverableAt).toBeNull();
  });

  it("ignore les ouvertures et les clics", async () => {
    expect(await applyEmailEvent(db, { type: "email.opened", data: { email_id: "evt-1" } })).toBe("ignore");
  });
});
