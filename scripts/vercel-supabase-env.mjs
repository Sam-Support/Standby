/**
 * Pose dans Vercel les trois variables Supabase d'un environnement, sans que les secrets passent par un terminal
 * ou une conversation : ils sont lus dans un fichier local, qui est effacé à la fin.
 *
 * Usage : node scripts/vercel-supabase-env.mjs <production|preview> <référence du projet Supabase> <fichier>
 *
 * Le fichier contient deux lignes :
 *   DB_PASSWORD=mot de passe de la base (Project Settings → Database → Reset database password)
 *   SUPABASE_SECRET_KEY=sb_secret_… (Project Settings → API Keys → clé « secret »)
 *
 * Le script construit DATABASE_URL (pooler, mode transaction, port 6543) et DATABASE_URL_DIRECT (pooler, mode
 * session, port 5432), vérifie la connexion pour trouver le serveur pooler du projet, puis enregistre les trois
 * variables avec `vercel env add --sensitive --force` (la CLI Vercel doit être connectée : `vercel login`).
 */
import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import postgres from "postgres";

const [target, ref, file] = process.argv.slice(2);
if (!["production", "preview"].includes(target ?? "") || !/^[a-z]{20}$/.test(ref ?? "") || !file) {
  console.error("Usage : node scripts/vercel-supabase-env.mjs <production|preview> <référence Supabase> <fichier>");
  process.exit(1);
}

const values = Object.fromEntries(
  (await readFile(file, "utf8"))
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const password = values.DB_PASSWORD;
const secretKey = values.SUPABASE_SECRET_KEY;
if (!password || !secretKey) {
  console.error("Le fichier doit contenir DB_PASSWORD=… et SUPABASE_SECRET_KEY=…");
  process.exit(1);
}
if (!/^sb_secret_/.test(secretKey) && !/^eyJ/.test(secretKey)) {
  console.error("SUPABASE_SECRET_KEY doit être une clé « secret » (sb_secret_…) ou l'ancienne clé service_role.");
  process.exit(1);
}

// Les projets sont répartis sur plusieurs serveurs pooler par région : on essaie ceux de l'Union européenne
// jusqu'à ce qu'une connexion aboutisse.
const REGIONS = ["eu-central-1", "eu-west-3", "eu-west-1", "eu-west-2", "eu-north-1", "eu-central-2"];
const HOSTS = REGIONS.flatMap((r) => [`aws-0-${r}.pooler.supabase.com`, `aws-1-${r}.pooler.supabase.com`]);
const url = (host, port) => `postgres://postgres.${ref}:${encodeURIComponent(password)}@${host}:${port}/postgres?sslmode=require`;

let host = null;
for (const candidate of HOSTS) {
  const sql = postgres(url(candidate, 6543), { max: 1, prepare: false, connect_timeout: 8, ssl: "require" });
  try {
    await sql`select 1`;
    host = candidate;
    await sql.end();
    break;
  } catch (e) {
    await sql.end({ timeout: 1 }).catch(() => {});
    const message = String(e?.message ?? e);
    if (/password authentication failed|Tenant or user not found/i.test(message)) {
      // le serveur répond : si le mot de passe est faux, inutile d'essayer les autres
      if (/password/i.test(message)) {
        console.error(`Connexion refusée par ${candidate} : mot de passe incorrect ?`);
        process.exit(1);
      }
    }
  }
}
if (!host) {
  console.error("Aucun serveur pooler n'a accepté la connexion : vérifiez la référence du projet et le mot de passe.");
  process.exit(1);
}
console.info(`Pooler trouvé : ${host}`);

function setEnv(name, value) {
  const r = spawnSync("vercel", ["env", "add", name, target, "--sensitive", "--force"], {
    input: value,
    encoding: "utf8",
    shell: true,
  });
  const out = (r.stdout + r.stderr).split("\n").find((l) => /Added|Error|error/i.test(l)) ?? "";
  if (r.status !== 0 || /error/i.test(out)) {
    console.error(`Échec pour ${name} : ${out.trim()}`);
    process.exit(1);
  }
  console.info(`✓ ${name} (${target})`);
}

setEnv("DATABASE_URL", url(host, 6543));
setEnv("DATABASE_URL_DIRECT", url(host, 5432));
setEnv("SUPABASE_SERVICE_ROLE_KEY", secretKey);

await rm(file, { force: true });
console.info(`Fichier ${file} effacé. Variables posées pour l'environnement ${target}.`);
