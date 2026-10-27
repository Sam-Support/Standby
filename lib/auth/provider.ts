import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { supabaseAdmin, supabaseAnon, supabaseEnabled } from "@/lib/integrations/supabase";
import { hashPassword, verifyPassword } from "./password";

/**
 * Fournisseur d'identité : Supabase Auth si configuré, sinon table `credentials` locale (scrypt).
 * Dans les deux cas, l'application garde ensuite sa propre session signée (cookie).
 */

export class AuthError extends Error {}

export async function createIdentity(email: string, password: string): Promise<string> {
  if (supabaseEnabled()) {
    const { data, error } = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) {
      throw new AuthError(error?.message.includes("already") ? "Un compte existe déjà avec cet e-mail." : "Création du compte impossible.");
    }
    return data.user.id;
  }
  return randomUUID();
}

/** À appeler une fois le profil inséré (mode local uniquement). */
export async function storeLocalPassword(db: Db, userId: string, password: string) {
  if (supabaseEnabled()) return;
  const passwordHash = await hashPassword(password);
  await db.insert(s.credentials).values({ userId, passwordHash }).onConflictDoUpdate({ target: s.credentials.userId, set: { passwordHash } });
}

export async function verifyIdentity(db: Db, email: string, password: string): Promise<string | null> {
  if (supabaseEnabled()) {
    const { data, error } = await supabaseAnon().auth.signInWithPassword({ email, password });
    return error || !data.user ? null : data.user.id;
  }
  const [row] = await db
    .select({ id: s.profiles.id, hash: s.credentials.passwordHash })
    .from(s.profiles)
    .innerJoin(s.credentials, eq(s.credentials.userId, s.profiles.id))
    .where(eq(s.profiles.email, email));
  if (!row) return null;
  return (await verifyPassword(password, row.hash)) ? row.id : null;
}

/** Suppression de l'identité (droit à l'effacement). Le profil applicatif est anonymisé à part. */
export async function deleteIdentity(db: Db, userId: string) {
  if (supabaseEnabled()) {
    const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);
    if (error && !/not found/i.test(error.message)) throw new AuthError("Suppression de l’identité impossible.");
  }
  await db.delete(s.credentials).where(eq(s.credentials.userId, userId));
}

export async function updateIdentityPassword(db: Db, userId: string, password: string) {
  if (supabaseEnabled()) {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password });
    if (error) throw new AuthError("Mise à jour du mot de passe impossible.");
    return;
  }
  await storeLocalPassword(db, userId, password);
}
