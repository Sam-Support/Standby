# Plateforme — sécurité
- ÉLEVÉE, S1 : pages admin protégées seulement par le layout. Corrigé.
- MOYENNE, S2 à S6 : confusion de jetons, redirection ouverte, injection CSV, secret de développement en
  production, jetons de réinitialisation en clair. Corrigés.
- FAIBLE, S7 à S11 : fichiers, type de document, étapes d'inscription, URL d'un salon, déclenchement du
  déploiement. Corrigés.
- ÉLEVÉE, S12 (13 novembre 2026, découvert au premier déploiement Vercel) : les tables créées par Drizzle
  avaient RLS désactivée et étaient lisibles par les rôles anon et authenticated de Supabase, donc par l'API
  REST publique avec la clé publique. Aucune donnée exposée (base staging vide, production pas encore migrée).
  Corrigé : migration 0011 (RLS partout, droits et privilèges par défaut retirés), test dans db/db.test.ts.
- ÉLEVÉE, S13 (13 novembre 2026, découvert sur l'aperçu Vercel) : toute action protégée par les limites de
  tentatives (connexion, inscription, mot de passe oublié, contact) échouait sur la vraie base : Drizzle neutralise
  la conversion des dates de postgres-js et un Date passé dans un fragment sql`` faisait planter le pilote. PGlite,
  utilisé par tous les tests, l'accepte. Corrigé dans db/index.ts (serializeDates), test dans db/db.test.ts, et
  parcours principal vérifié par postgres-js sur PGlite exposé en TCP. À suivre : faire tourner une partie des
  tests sur le vrai pilote en CI.
- À suivre : test d'intrusion avant l'ouverture, double authentification des admins, actions GitHub épinglées
  par SHA, dépendance uuid via exceljs, révocation des sessions côté serveur.
