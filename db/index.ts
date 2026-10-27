import path from "node:path";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export { schema };

const MIGRATIONS = path.join(process.cwd(), "db", "migrations");

type GlobalDb = { __standbyDb?: Promise<Db> };
const g = globalThis as GlobalDb;

/**
 * Production : Postgres (Supabase) via DATABASE_URL, migrations appliquées au démarrage.
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
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const client = postgres(url, { max: 10, prepare: false });
    const db = drizzlePostgres(client, { schema });
    if (process.env.RUN_MIGRATIONS !== "0") {
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
