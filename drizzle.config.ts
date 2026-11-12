import { defineConfig } from "drizzle-kit";

/**
 * Migrations (`npm run db:migrate`, aussi lancé à la construction sur Vercel) : de préférence par une connexion
 * en mode session (DATABASE_URL_DIRECT, ou POSTGRES_URL_NON_POOLING posée par l'intégration Supabase de Vercel),
 * à défaut par celle de l'application.
 */
const url = process.env.DATABASE_URL_DIRECT || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
