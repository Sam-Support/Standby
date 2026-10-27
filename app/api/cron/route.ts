import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { runPayouts } from "@/lib/services/billing";
import { advanceBookings } from "@/lib/services/booking";
import { autoValidateHours } from "@/lib/services/hours";

/**
 * Tâches planifiées, appelées par le conteneur cron du VPS :
 * statuts (début/fin d'événement, expiration à 48 h), validation automatique J+3, virements dus.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getDb();
  const statuses = await advanceBookings(db);
  const validated = await autoValidateHours(db);
  const payouts = await runPayouts(db);
  return Response.json({ statuses, validated, payouts });
}
