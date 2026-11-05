import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";

// Suivi des e-mails envoyés par Resend : signature du webhook, état de remise, adresses en échec.

/**
 * Signature Svix des webhooks Resend : HMAC-SHA256 de « id.timestamp.corps brut », clé = secret « whsec_… »
 * décodé en base64 ; l'en-tête peut porter plusieurs signatures « v1,… » séparées par des espaces.
 */
export function verifyResendSignature(
  body: string,
  h: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  now = Date.now(),
): boolean {
  if (!h.id || !h.timestamp || !h.signature) return false;
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 5 * 60) return false; // rejeu
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${h.id}.${h.timestamp}.${body}`).digest();
  return h.signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

type ResendEvent = {
  type: string;
  data: { email_id?: string; to?: string[]; bounce?: { message?: string; type?: string; subType?: string } };
};

// une remise arrivée avant l'accusé d'envoi ne doit pas être écrasée par lui
const RANK: Record<string, number> = { simule: 0, en_attente: 0, envoye: 1, differe: 2, delivre: 3, echec: 4, bloque: 4, rebond: 4, plainte: 5 };
const STATUS: Record<string, string> = {
  "email.sent": "envoye",
  "email.delivered": "delivre",
  "email.delivery_delayed": "differe",
  "email.bounced": "rebond",
  "email.complained": "plainte",
  "email.suppressed": "bloque",
  "email.failed": "echec",
};
const UNDELIVERABLE: Record<string, string> = {
  rebond: "rebond définitif",
  plainte: "signalé comme indésirable",
  bloque: "adresse bloquée par Resend après des rebonds",
};

/** Applique un événement Resend au journal et, en cas d'échec définitif, au compte destinataire. */
export async function applyEmailEvent(db: Db, event: ResendEvent): Promise<"ignore" | "applique"> {
  const status = STATUS[event.type];
  const providerId = event.data?.email_id;
  if (!status || !providerId) return "ignore"; // ouvertures, clics… : non suivis
  const softBounce = status === "rebond" && event.data.bounce?.type !== "Permanent";
  const [row] = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.providerId, providerId));
  if (row && RANK[status] >= (RANK[row.status] ?? 0)) {
    await db
      .update(s.emailOutbox)
      .set({ status: softBounce ? "differe" : status, error: event.data.bounce?.message ?? row.error, updatedAt: new Date() })
      .where(eq(s.emailOutbox.id, row.id));
  }
  const to = event.data.to ?? (row ? [row.to] : []);
  if (to.length === 0) return "applique";
  if (UNDELIVERABLE[status] && !softBounce) {
    const reason = [UNDELIVERABLE[status], event.data.bounce?.message].filter(Boolean).join(" : ");
    await db.update(s.profiles).set({ emailUndeliverableAt: new Date(), emailUndeliverableReason: reason.slice(0, 500) }).where(inArray(s.profiles.email, to));
  } else if (status === "delivre") {
    // l'adresse reçoit de nouveau nos e-mails
    await db.update(s.profiles).set({ emailUndeliverableAt: null, emailUndeliverableReason: null }).where(inArray(s.profiles.email, to));
  }
  return "applique";
}
