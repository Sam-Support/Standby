# Plateforme — sécurité
- ÉLEVÉE, S1 : pages admin protégées seulement par le layout. Corrigé.
- MOYENNE, S2 à S6 : confusion de jetons, redirection ouverte, injection CSV, secret de développement en
  production, jetons de réinitialisation en clair. Corrigés.
- FAIBLE, S7 à S11 : fichiers, type de document, étapes d'inscription, URL d'un salon, déclenchement du
  déploiement. Corrigés.
- À suivre : test d'intrusion avant l'ouverture, double authentification des admins, actions GitHub épinglées
  par SHA, dépendance uuid via exceljs, révocation des sessions côté serveur.
