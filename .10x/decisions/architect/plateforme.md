# Plateforme — architecture [DISCOVERED]
- Monolithe Next.js : pages serveur et actions (`app/**/actions.ts`) qui appellent des services
  (`lib/services/*`, testés sur PGlite) ; intégrations isolées dans `lib/integrations/*`.
- Frontières de confiance : navigateur, puis proxy.ts (langue, CSP, contrôle optimiste de session), puis pages
  et actions (autorisation réelle, ADR-002), puis services (propriété des objets revérifiée).
- Données sensibles : documents d'identité et RIB dans le bucket privé, servis par /api/fichiers avec contrôle
  d'accès ; jetons CRM chiffrés (AES-256-GCM).
- Tâches planifiées : conteneur cron qui appelle /api/cron (secret partagé).
- Webhooks entrants : Stripe et Resend, signés.
