# Plateforme — livraison
- CI (push sur main et PR) : lint, types, tests, build, tests de bout en bout (`.github/workflows/ci.yml`).
- Hébergement : Vercel, projet relié au dépôt GitHub (ADR-003). Chaque pull request a un aperçu (environnement
  Preview, projet Supabase `standby-staging`), chaque fusion dans `main` part en production (projet Supabase de
  production). Région des fonctions : Francfort (`fra1`), à côté de Supabase (`eu-central-1`).
- `vercel.json` : `buildCommand` = `npm run db:migrate && npm run build` (migrations Drizzle appliquées à la
  construction, par la connexion `DATABASE_URL_DIRECT` en mode session), Schedule `taches-planifiees` qui
  appelle `/api/cron` en GET toutes les 15 min avec `Authorization: Bearer CRON_SECRET`.
- Connexion de l'application : pooler Supabase en mode transaction (`prepare: false`, 3 connexions par instance).
  Sur Vercel, pas de migration au démarrage ni de stockage local (erreur explicite sans Supabase Storage).
- Retour arrière : Vercel → Deployments → Instant Rollback. Les migrations doivent rester compatibles avec la
  version précédente (expansion d'abord, suppression plus tard).
- Variables : dans Vercel, séparément pour Production et Preview (docs/06 étape 6, modèle `.env.example`). Les
  noms posés par l'intégration Supabase de Vercel (`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`,
  `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`) sont acceptés en repli.
- Avant l'ouverture : épingler les actions par SHA ; protéger `main` (CI obligatoire) ; supervision externe de
  `/api/health?db=1` ; Sentry via la place de marché Vercel.
- Abandonné le 12 novembre 2026 : image Docker, Caddy, workflow `deploy.yml`, conteneur cron (historique git).
