import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
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
export async function storeLocalPassword(userId: string, password: string) {
  if (supabaseEnabled()) return;
  const db = await getDb();
  await db
    .insert(s.credentials)
    .values({ userId, passwordHash: await hashPassword(password) })
    .onConflictDoUpdate({ target: s.credentials.userId, set: { passwordHash: await hashPassword(password) } });
}

export async function verifyIdentity(email: string, password: string): Promise<string | null> {
  if (supabaseEnabled()) {
    const { data, error } = await supabaseAnon().auth.signInWithPassword({ email, password });
    return error || !data.user ? null : data.user.id;
  }
  const db = await getDb();
  const [row] = await db
    .select({ id: s.profiles.id, hash: s.credentials.passwordHash })
    .from(s.profiles)
    .innerJoin(s.credentials, eq(s.credentials.userId, s.profiles.id))
    .where(eq(s.profiles.email, email));
  if (!row) return null;
  return (await verifyPassword(password, row.hash)) ? row.id : null;
}

export async function updateIdentityPassword(userId: string, password: string) {
  if (supabaseEnabled()) {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password });
    if (error) throw new AuthError("Mise à jour du mot de passe impossible.");
    return;
  }
  await storeLocalPassword(userId, password);
}
