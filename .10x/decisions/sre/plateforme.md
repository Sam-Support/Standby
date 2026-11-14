# Plateforme — exploitation
- Vivacité : /api/health (sans base). Disponibilité de la base : /api/health?db=1, à brancher sur une
  supervision externe (alerte après deux échecs consécutifs). Journaux d'exécution dans Vercel (Project → Logs).
- E-mails : /admin/emails (configuration, e-mail de test, rebonds) ; webhook Resend pour la remise.
- Paiements : webhook Stripe ; paiements en échec relançables depuis l'admin.
- Tâches planifiées : /api/cron toutes les 15 min (Schedule Vercel, vercel.json) ; l'historique des exécutions et
  les échecs sont dans Vercel (Project → Schedules). À prévoir : alerte si aucune exécution depuis une heure.
- Retour arrière : Vercel → Deployments → Instant Rollback (immédiat, sans reconstruction). Les migrations étant
  appliquées à la construction, une migration doit rester compatible avec la version précédente du code.
- Recommandé avant l'ouverture : suivi des erreurs (Sentry ou équivalent), centralisation des journaux, procédure
  écrite de restauration de la base.
