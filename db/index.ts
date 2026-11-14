import path from "node:path";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export { schema };

const MIGRATIONS = path.join(process.cwd(), "db", "migrations");

type GlobalDb = { __standbyDb?: Promise<Db> };
const g = globalThis as GlobalDb;

/** Chaîne de connexion de l'application : DATABASE_URL, ou POSTGRES_URL posée par l'intégration Supabase de Vercel. */
export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

type PgClient = { options: { serializers: Record<number, ((value: unknown) => unknown) | undefined> } };

/**
 * Drizzle remplace la conversion des dates de postgres-js par une fonction qui laisse passer la valeur telle
 * quelle : il convertit lui-même les colonnes de date. Un Date passé dans un fragment sql`` (ex. limites de
 * tentatives) partirait alors brut et ferait planter le pilote (« Received an instance of Date »). PGlite, utilisé
 * en local et dans les tests, l'accepte : seule la vraie base le révèle. On rétablit la conversion en ISO 8601.
 */
export function serializeDates(client: PgClient) {
  for (const type of [1082, 1083, 1114, 1184]) {
    const keep = client.options.serializers[type];
    client.options.serializers[type] = (value) => (value instanceof Date ? value.toISOString() : keep ? keep(value) : value);
  }
}

/**
 * Les migrations s'appliquent au démarrage, sauf sur Vercel où elles sont faites à la construction (vercel.json :
 * `npm run db:migrate`), avant la mise en ligne de la version : des dizaines d'instances qui démarrent en même
 * temps ne doivent pas migrer en parallèle. RUN_MIGRATIONS=1 ou 0 force le comportement.
 */
function migrateOnStartup() {
  const forced = process.env.RUN_MIGRATIONS;
  if (forced) return forced !== "0";
  return !process.env.VERCEL;
}

/**
 * Production : Postgres (Supabase) via le pooler en mode transaction (`prepare: false`, obligatoire en serverless).
 * Développement : PGlite (Postgres embarqué) dans .data/pglite, migré et peuplé automatiquement.
 */
export function getDb(): Promise<Db> {
  g.__standbyDb ??= init().catch((e) => {
    // un échec d'initialisation n'est pas mis en cache : la requête suivante réessaie
    g.__standbyDb = undefined;
    throw e;
  });
  return g.__standbyDb;
}

async function init(): Promise<Db> {
  if (process.env.VITEST) {
    // les tests passent leur propre base : ouvrir celle du développement en parallèle du serveur la corromprait
    throw new Error("getDb() est interdit dans les tests : passez la base créée par createPgliteDb().");
  }
  const url = databaseUrl();
  if (url) {
    const { default: postgres } = await import("postgres");
    // peu de connexions par instance : sur Vercel, chaque instance de fonction a son propre pool
    const client = postgres(url, { max: process.env.VERCEL ? 3 : 10, prepare: false });
    const db = drizzlePostgres(client, { schema });
    serializeDates(client as unknown as PgClient);
    if (migrateOnStartup()) {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: MIGRATIONS });
    }
    const { seedEssentials } = await import("./seed");
    await seedEssentials(db);
    return db;
  }
  if (process.env.NODE_ENV === "production" && process.env.DB_DRIVER !== "pglite") {
    throw new Error("DATABASE_URL manquante. Définissez-la, ou DB_DRIVER=pglite pour une démo locale.");
  }
  return createPgliteDb(process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite"), true);
}

/** Base PGlite (mémoire si dir === null). Utilisée en développement et dans les tests. */
export async function createPgliteDb(dir: string | null, seed: boolean): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const client = dir ? new PGlite(dir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  const typed = db as unknown as Db;
  if (seed) {
    const { seedIfEmpty } = await import("./seed");
    await seedIfEmpty(typed);
  }
  return typed;
}
