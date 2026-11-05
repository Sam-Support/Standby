# Plateforme — exploitation
- Vivacité : /api/health (sonde Docker, sans base). Disponibilité de la base : /api/health?db=1, à brancher sur une
  supervision externe (alerte après deux échecs consécutifs).
- E-mails : /admin/emails (configuration, e-mail de test, rebonds) ; webhook Resend pour la remise.
- Paiements : webhook Stripe ; paiements en échec relançables depuis l'admin.
- Tâches planifiées : /api/cron toutes les 15 min (conteneur cron) ; un échec n'est visible que dans les journaux
  du conteneur. À prévoir : alerte si aucune exécution depuis une heure.
- Recommandé avant l'ouverture : suivi des erreurs (Sentry ou équivalent), centralisation des journaux, procédure
  écrite de restauration de la base.
