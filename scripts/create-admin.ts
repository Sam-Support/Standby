/**
 * Crée (ou promeut) un compte administrateur.
 * Usage : npm run admin:create -- prenom.nom@domaine.fr "mot de passe" Prénom Nom
 * Utilise DATABASE_URL et, si configuré, Supabase Auth (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */
import { eq } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { createIdentity, storeLocalPassword } from "../lib/auth/provider";

async function main() {
  const [email, password, firstName = "Équipe", lastName = "Standby"] = process.argv.slice(2);
  if (!email || !password || password.length < 10) {
    console.error("Usage : npm run admin:create -- email \"mot de passe (10 caractères min.)\" [Prénom] [Nom]");
    process.exit(1);
  }
  const db = await getDb();
  const [existing] = await db.select().from(s.profiles).where(eq(s.profiles.email, email.toLowerCase()));
  if (existing) {
    await db.update(s.profiles).set({ role: "admin" }).where(eq(s.profiles.id, existing.id));
    console.info(`Compte existant promu administrateur : ${email}`);
    process.exit(0);
  }
  const id = await createIdentity(email.toLowerCase(), password);
  await db.insert(s.profiles).values({ id, email: email.toLowerCase(), role: "admin", firstName, lastName, emailVerifiedAt: new Date() });
  await storeLocalPassword(id, password);
  console.info(`Administrateur créé : ${email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
