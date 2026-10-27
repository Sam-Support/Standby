import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { purgeExpiredData } from "@/lib/services/privacy";
import { runPayouts } from "@/lib/services/billing";
import { advanceBookings } from "@/lib/services/booking";
import { autoValidateHours } from "@/lib/services/hours";
import { sendReminders } from "@/lib/services/reminders";

/**
 * Tâches planifiées, appelées par le conteneur cron du VPS :
 * statuts (début/fin d'événement, expiration à 48 h), rappels J-7 et J-2, validation automatique J+3,
 * virements dus, purge des données arrivées à échéance.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getDb();
  const statuses = await advanceBookings(db);
  const reminders = await sendReminders(db);
  const validated = await autoValidateHours(db);
  const payouts = await runPayouts(db);
  const purged = await purgeExpiredData(db);
  return Response.json({ statuses, reminders, validated, payouts, purged });
}
