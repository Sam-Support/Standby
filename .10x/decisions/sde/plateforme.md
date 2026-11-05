# Plateforme — ce qui a été fait (revue du 30 octobre 2026)
- requireAdmin() dans les 13 pages admin ; test de garde.
- lib/crypto.ts : jetons liés à leur usage (ADR-001), hashToken ; AUTH_SECRET obligatoire en production
  (sauf ALLOW_DEV_SECRET=1).
- lib/action.ts : safeNext strict ; lib/i18n/config.ts : localizePath ignore « /\ » et « // ».
- toCsv : neutralisation des formules.
- Réinitialisation du mot de passe : empreinte en base, consommation atomique.
- /api/fichiers : segments validés, pas de double décodage, 404 au lieu de 500.
- uploadDocAction : type contrôlé ; inscription : pas de saut d'étape ; site d'un salon en http(s).
- Migration 0009 : index des clés étrangères lues à chaque requête.
- /api/health?db=1 (vérifie la base) ; déploiement seulement après une CI déclenchée par un push.
- Dette : sessions sans révocation côté serveur ; actions GitHub non épinglées par SHA ; uuid via exceljs.
