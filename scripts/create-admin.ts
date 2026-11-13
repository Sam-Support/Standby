/**
 * Crée un compte administrateur, ou promeut un compte existant et change son mot de passe, dans la base de
 * l'environnement courant : base locale PGlite par défaut, ou celle désignée par DATABASE_URL (et Supabase Auth si
 * SUPABASE_URL et la clé secrète sont définies).
 *
 * Usage : npm run admin:create -- [email] [Prénom] [Nom]
 *
 * Le mot de passe est demandé au clavier, sans s'afficher : il ne reste ni dans l'historique du terminal ni dans
 * la liste des processus (ADMIN_PASSWORD le fournit sans saisie, pour les tests et l'automatisation).
 * Sur Vercel, les secrets sont illisibles depuis un poste : le premier administrateur se crée par le formulaire
 * d'inscription du site, puis est promu dans Supabase (docs/06-MISE-EN-LIGNE.md, étape 7).
 */
import { createInterface } from "node:readline";
import { eq, sql } from "drizzle-orm";
import { getDb, schema as s } from "../db";
import { createIdentity, storeLocalPassword, updateIdentityPassword } from "../lib/auth/provider";

const MIN_PASSWORD = 10;

function ask(query: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    if (hidden) {
      // la saisie n'est pas renvoyée à l'écran
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (chunk) => {
        if (!muted) process.stdout.write(chunk);
      };
    }
    rl.question(query, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
    muted = hidden;
  });
}

async function main() {
  let [email = "", firstName = "", lastName = ""] = process.argv.slice(2);
  email ||= await ask("E-mail de l'administrateur : ");
  email = email.toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Adresse e-mail invalide.");
    process.exit(1);
  }

  const db = await getDb();
  try {
    await db.execute(sql`select 1 from profiles limit 1`);
  } catch {
    console.error("La base n'est pas migrée : lancez npm run db:migrate, ou déployez cet environnement sur Vercel.");
    process.exit(1);
  }
  const [existing] = await db.select().from(s.profiles).where(eq(s.profiles.email, email));

  // ADMIN_PASSWORD : saisie non interactive (tests, automatisation) ; sinon, demandé deux fois au clavier
  const fromEnv = process.env.ADMIN_PASSWORD;
  const password = fromEnv || (await ask(`Mot de passe (${MIN_PASSWORD} caractères minimum, ne s'affiche pas) : `, true));
  if (password.length < MIN_PASSWORD) {
    console.error(`Mot de passe trop court : ${MIN_PASSWORD} caractères minimum.`);
    process.exit(1);
  }
  if (!fromEnv && (await ask("Confirmation : ", true)) !== password) {
    console.error("Les deux saisies diffèrent.");
    process.exit(1);
  }

  if (existing) {
    await updateIdentityPassword(db, existing.id, password);
    // le changement de mot de passe ferme les sessions ouvertes, comme depuis « Mon compte »
    await db
      .update(s.profiles)
      .set({ role: "admin", emailVerifiedAt: existing.emailVerifiedAt ?? new Date(), sessionVersion: sql`${s.profiles.sessionVersion} + 1` })
      .where(eq(s.profiles.id, existing.id));
    console.info(`Compte existant : ${email} est administrateur, mot de passe changé.`);
    process.exit(0);
  }

  firstName ||= (await ask("Prénom [Équipe] : ")) || "Équipe";
  lastName ||= (await ask("Nom [Standby] : ")) || "Standby";
  const id = await createIdentity(email, password);
  await db.insert(s.profiles).values({ id, email, role: "admin", firstName, lastName, emailVerifiedAt: new Date() });
  await storeLocalPassword(db, id, password);
  console.info(`Administrateur créé : ${email}. Connexion : /connexion, puis /admin.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
