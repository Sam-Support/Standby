# Plateforme — livraison
- CI (push sur main et PR) : lint, types, tests, build, tests de bout en bout.
- Déploiement : après une CI réussie sur un push vers main, image ghcr.io étiquetée par SHA,
  `docker compose up -d` sur le VPS.
- Retour arrière : `IMAGE_TAG=<sha précédent> docker compose up -d app` dans le dossier du VPS.
- Avant l'ouverture : épingler les actions par SHA ; variables AUTH_SECRET, ENCRYPTION_KEY, CRON_SECRET,
  Resend (docs/05-EMAILS.md), Stripe et Supabase.
