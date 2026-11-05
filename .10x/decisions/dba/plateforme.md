# Plateforme — base de données
- Postgres (Supabase, UE) en production, PGlite en local et dans les tests ; migrations appliquées au démarrage.
- 0007 : profiles.locale. 0008 : journal des e-mails (état, identifiant Resend, erreur), adresses en échec sur
  profiles. 0009 : index sur companies.owner_id (lu à chaque requête), payments.booking_id, payouts.freelancer_id,
  company_referents.company_id, lead_batches.assignment_id, leads.batch_id, business_cards.batch_id,
  password_resets.user_id.
- Index créés sans CONCURRENTLY : les tables sont encore petites. À revoir pour une grande table en production.
- password_resets.token contient désormais l'empreinte SHA-256 du jeton : les liens envoyés avant le déploiement
  ne fonctionnent plus (validité d'une heure).
- Sauvegardes : celles de Supabase selon l'offre ; vérifier la restauration à un instant donné (PITR) avant l'ouverture.
