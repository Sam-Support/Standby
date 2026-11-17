import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  // hookTimeout : chaque fichier migre et peuple sa propre base PGlite, plus lent quand les fichiers tournent en parallèle
  // PWNED_PASSWORDS_URL=off : aucun test n'interroge le vrai service de mots de passe divulgués
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    env: { PWNED_PASSWORDS_URL: "off" },
  },
});
