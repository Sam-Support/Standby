/**
 * Crée un compte administrateur, ou promeut un compte existant et change son mot de passe.
 *
 * Usage : npm run admin:create (base locale), npm run admin:create:preview ou npm run admin:create:production
 * (raccourcis de --env preview|production, utiles sous PowerShell qui retire le « -- » de npm run).
 *
 * Le mot de passe est demandé au clavier, sans s'afficher : il ne reste ni dans l'historique du terminal ni dans
 * la liste des processus (ADMIN_PASSWORD le fournit sans saisie, pour les tests et l'automatisation). Avec --env, les accès à la base et à Supabase sont lus dans les
 * variables de cet environnement Vercel (`vercel env pull`, CLI connectée et dossier lié au projet) puis
 * effacés à la fin ; sans --env, ceux de l'environnement courant (base locale PGlite par défaut).
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

/** Variables d'un environnement Vercel, via un fichier temporaire effacé aussitôt lu. */
function loadVercelEnv(target: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "standby-admin-"));
  const file = path.join(dir, "env");
  try {
    const r = spawnSync("vercel", ["env", "pull", file, `--environment=${target}`, "--yes"], { encoding: "utf8", shell: true });
    if (r.status !== 0) throw new Error(`vercel env pull a échoué (CLI connectée ? dossier lié au projet ?)\n${r.stderr}`);
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(?:"(.*)"|(.*))$/.exec(line);
      if (m) process.env[m[1]] = (m[2] ?? m[3] ?? "").replace(/\n/g, "\n");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) throw new Error(`Aucune DATABASE_URL dans l'environnement Vercel « ${target} ».`);
}

async function main() {
  const args = process.argv.slice(2);
  const envAt = args.indexOf("--env");
  const target = envAt >= 0 ? args.splice(envAt, 2)[1] : undefined;
  if (target !== undefined && target !== "preview" && target !== "production") {
    console.error("--env attend preview ou production.");
    process.exit(1);
  }
  if (target) {
    loadVercelEnv(target);
    console.info(`Environnement Vercel : ${target} (${new URL(process.env.SUPABASE_URL ?? "http://local").host})`);
  }

  let [email = "", firstName = "", lastName = ""] = args;
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
    console.error("La base n'est pas migrée : déployez d'abord cet environnement sur Vercel (les migrations s'appliquent à la construction).");
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
