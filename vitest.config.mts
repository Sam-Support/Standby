import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  // hookTimeout : chaque fichier migre et peuple sa propre base PGlite, plus lent quand les fichiers tournent en parallèle
  test: { environment: "node", include: ["**/*.test.ts"], exclude: ["node_modules", ".next"], testTimeout: 60_000, hookTimeout: 60_000 },
});
