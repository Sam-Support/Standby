# ADR-003 : Hébergement sur Vercel et Supabase plutôt que sur un VPS

**Statut** : Accepté
**Date** : 2026-11-12
**Feature** : plateforme
**Auteur** : 10x-Team (CTO + DevOps), à la demande de l'équipe Standby

## Contexte
Le plan initial (docs/03, docs/04) prévoyait un VPS : image Docker construite par GitHub Actions, Caddy pour
HTTPS, conteneur cron pour `/api/cron`, secrets dans un `.env` sur la machine. Rien n'était encore déployé.
L'équipe est petite (un développeur), sans personne pour administrer un serveur, et Supabase était déjà le
fournisseur de base, de stockage et d'authentification. L'équipe a décidé de passer sur Vercel, relié à Supabase.

## Décision
- **Vercel** héberge l'application Next.js : projet relié au dépôt GitHub, aperçu par pull request, production
  depuis `main`, fonctions Node.js (Fluid Compute) en région Francfort (`fra1`), à côté de Supabase
  (`eu-central-1`).
- **Deux projets Supabase** : production et `standby-staging` (environnement Preview), pour qu'aucune pull request
  ne touche la base de production.
- **Migrations à la construction** (`vercel.json` : `npm run db:migrate && npm run build`), par le pooler en mode
  session, et plus au démarrage : des instances serverless qui démarrent en parallèle ne doivent pas migrer en
  même temps. Conséquence : une migration doit rester compatible avec la version de code précédente.
- **Connexion de l'application par le pooler Supabase en mode transaction** (`prepare: false`), peu de
  connexions par instance.
- **Tâches planifiées** par un Schedule Vercel toutes les 15 minutes (accepté sur l'offre gratuite), qui appelle
  `/api/cron` avec `Authorization: Bearer CRON_SECRET`. La route accepte GET (Vercel) et POST (relance externe).
- **Secrets** dans les variables d'environnement Vercel, par environnement, marquées sensibles.
- Supprimés : Dockerfile, Caddy, Docker Compose, workflow `deploy.yml`, conteneur cron. La CI GitHub (tests) reste
  et doit devenir obligatoire sur `main`.

## Alternatives considérées
| Alternative | Pour | Contre | Pourquoi pas |
|---|---|---|---|
| VPS Docker + Caddy (plan initial) | coût fixe faible, contrôle total, pas de limite de durée | serveur à administrer (mises à jour, pare-feu, sauvegardes, astreinte), pas d'aperçu par PR, déploiement par SSH | personne pour l'exploiter |
| Vercel avec migrations au démarrage | aucun changement de code | collisions entre instances qui migrent en parallèle ; latence au premier appel après chaque déploiement | fragile en serverless |
| Supabase Branching pour les aperçus | une base par PR, automatique | offre Pro Supabase, coût par branche | un second projet gratuit suffit à cette taille |
| Un seul projet Supabase pour tout | plus simple | les aperçus de PR migreraient et écriraient dans la base de production | inacceptable |

## Conséquences

### Positives
- Mise en ligne à chaque fusion, aperçu par PR, retour arrière immédiat, HTTPS, HSTS, DDoS et journaux gérés.
- Aucun secret sur une machine ; variables séparées par environnement.
- Le code de l'application change peu : les variables de l'intégration Supabase de Vercel sont acceptées en repli.

### Négatives
- Dépendance à deux fournisseurs américains (Vercel Inc., Supabase Inc.) avec exécution et données en UE : à
  mentionner dans les mentions légales et à couvrir par leurs DPA.
- Durée maximale d'une fonction : 300 s sur l'offre gratuite (le cron reste bien en deçà).
- Les variables modifiées dans Vercel ne sont prises en compte qu'au déploiement suivant (*Redeploy*).

### Risques
- Migration incompatible avec le code en ligne pendant la construction : règle d'expansion d'abord (ajouter),
  suppression dans une version suivante.
- Pooler en mode transaction : pas de `prepare`, pas de verrou consultatif de session ; déjà respecté.
- Offre gratuite Vercel : usage non commercial dans les conditions de Vercel ; passer à Pro avant l'ouverture
  commerciale.

## Dépendances
- `vercel.json`, `db/index.ts` (`databaseUrl`, migrations conditionnelles), `drizzle.config.ts`,
  `lib/storage.ts` (pas de disque local sur Vercel), `app/api/cron/route.ts` (GET et POST).
- docs/06-MISE-EN-LIGNE.md (étapes 2, 4 et 6), docs/07-A-FAIRE.md, README.
