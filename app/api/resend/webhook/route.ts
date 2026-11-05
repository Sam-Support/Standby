import { getDb } from "@/db";
import { applyEmailEvent, verifyResendSignature } from "@/lib/services/emails";

/** Webhook Resend : remise, retard, rebond, plainte, blocage et échec de chaque e-mail envoyé. */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook Resend non configuré", { status: 404 });
  const body = await req.text();
  const ok = verifyResendSignature(
    body,
    { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") },
    secret,
  );
  if (!ok) return new Response("Signature invalide", { status: 400 });
  try {
    await applyEmailEvent(await getDb(), JSON.parse(body));
  } catch (e) {
    console.error("[resend] événement non traité", e);
    return new Response("Erreur", { status: 500 }); // Resend renverra l'événement
  }
  return Response.json({ received: true });
}
