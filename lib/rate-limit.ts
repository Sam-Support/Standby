import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Limitation des tentatives par clé (adresse IP, e-mail…), fenêtre fixe stockée en base :
 * elle survit aux redémarrages et vaut pour toutes les instances.
 */

export type Limit = { max: number; windowSeconds: number };

export const LIMITS = {
  loginIp: { max: 50, windowSeconds: 15 * 60 },
  loginEmail: { max: 8, windowSeconds: 15 * 60 },
  resetIp: { max: 10, windowSeconds: 60 * 60 },
  resetEmail: { max: 3, windowSeconds: 60 * 60 },
  contactIp: { max: 5, windowSeconds: 60 * 60 },
  signupIp: { max: 10, windowSeconds: 60 * 60 },
  verifyEmail: { max: 3, windowSeconds: 60 * 60 },
  // changement de mot de passe ou d'e-mail (le mot de passe actuel est vérifié à chaque essai)
  accountChange: { max: 5, windowSeconds: 15 * 60 },
} satisfies Record<string, Limit>;

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
    super(`Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`);
  }
}

function retryAfter(windowStart: Date, limit: Limit, now: Date) {
  return Math.max(0, Math.ceil((windowStart.getTime() + limit.windowSeconds * 1000 - now.getTime()) / 1000));
}

/** Compte une tentative ; lève RateLimitError si la limite est dépassée. */
export async function hit(db: Db, key: string, limit: Limit, now = new Date()) {
  const expired = new Date(now.getTime() - limit.windowSeconds * 1000);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} <= ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} <= ${expired} then ${now} else ${rateLimits.windowStart} end`,
      },
    })
    .returning();
  if (row.count > limit.max) throw new RateLimitError(retryAfter(row.windowStart, limit, now));
}

/** Vérifie sans compter (ex. échecs de connexion d'un e-mail avant de tester le mot de passe). */
export async function check(db: Db, key: string, limit: Limit, now = new Date()) {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
  if (!row) return;
  if (row.windowStart.getTime() + limit.windowSeconds * 1000 <= now.getTime()) return;
  if (row.count >= limit.max) throw new RateLimitError(retryAfter(row.windowStart, limit, now));
}

export async function reset(db: Db, key: string) {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
