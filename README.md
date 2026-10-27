# Standby Salons

Marketplace qui met en relation des **entreprises exposantes** et des **commerciaux, hôtes·ses, animateurs et interprètes indépendants** pour staffer les stands des salons professionnels et des foires.

Documentation produit : [PRD](docs/01-PRD.md) · [Flux](docs/02-FLUX.md) · [Architecture](docs/03-ARCHITECTURE.md) · [Plan](docs/04-PLAN.md)

## Démarrer en local (aucun compte externe requis)

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Sans variable d'environnement, l'application utilise :

- une base **PGlite** (Postgres embarqué) dans `.data/pglite`, migrée et remplie avec des données de démonstration au premier lancement ;
- un stockage de fichiers local dans `.data/uploads` ;
- des paiements, virements, e-mails (écrits dans la console), envois HubSpot et lecture de cartes **simulés**.

Comptes de démonstration (base locale uniquement), mot de passe défini dans [`db/seed.ts`](db/seed.ts) (`DEMO_PASSWORD`) :

| Rôle | E-mail |
|---|---|
| Entreprise (Maison Lumen) | `claire@maison-lumen.test` |
| Commercial | `karim.benali@standby.test` |
| Admin | `admin@standby.test` |

Repartir d'une base vierge : arrêtez le serveur et supprimez le dossier `.data`.

## Ce que fait l'application

- **Accueil** : calendrier des salons, profils disponibles, inscriptions.
- **Réservation en 5 étapes** : événement (jours, montage, horaires, stand) → équipe (postes, langues, tenue, estimation en direct) → brief (référent, plaquette, format des leads) → profils (matching pondéré, favoris, re-sélection) → récap et devis → confirmation.
- **Espace entreprise** : réservations et acceptations, heures à valider ou ajuster, leads reçus au format du template (export Excel ou envoi HubSpot), factures, profil.
- **Espace commercial** : missions à accepter ou refuser, déclaration des heures, dépôt des leads (Excel avec rapprochement automatique des colonnes, photos de cartes lues par Claude), revenus et virements du lundi, documents.
- **Admin** (`/admin`) : tableau de bord et commissions, salons et foires (logos, import CSV, dates vérifiées), **tarification versionnée** (frais de service, commission, TVA, planchers par poste, majoration tenue), validation des documents, arbitrage des heures, finances, saisie des cartes, messages.
- **Annulation** : barème réglable dans l'admin (par défaut gratuit à 14 jours ou plus, 30 % de 7 à 13 jours, 50 % de 2 à 6 jours, 100 % ensuite). Le montant exact est affiché avant de confirmer ; les frais sont facturés et les commerciaux déjà engagés reçoivent la même part en indemnité. L'admin peut annuler sans frais.
- **Avis** : après validation des heures, l'exposant note chaque membre de l'équipe (1 à 5 et commentaire) ; la moyenne alimente le matching, le commercial voit ses avis, l'admin modère (`/admin/avis`).
- **Rappels** : J-7 (badges à demander pour l'équipe Standby, point d'équipe pour l'exposant et les commerciaux) et J-2 (briefing avec le référent, coordonnées), un seul envoi chacun.
- **RGPD** (`/compte`) : export JSON de toutes ses données, suppression du compte (refusée tant qu'une réservation, une mission ou un paiement est en cours ; pièces comptables conservées 10 ans sur un profil anonymisé), purge automatique des leads après la durée réglée dans l'admin (365 jours par défaut).
- **Automatismes** (`/api/cron`, toutes les 15 min en production) : début et fin d'événement, expiration des propositions à 48 h avec remplaçant automatique, rappels J-7 et J-2, validation des heures à J+3, virements dus, purge des données arrivées à échéance.

## Sécurité

- **Limites de tentatives** (comptées en base) : connexion (8 échecs par e-mail et 50 tentatives par IP sur 15 min), mot de passe oublié, contact, inscription, renvoi du lien de vérification. Réglages dans [`lib/rate-limit.ts`](lib/rate-limit.ts).
- **Vérification de l'e-mail** à l'inscription (lien signé, 48 h) : sans elle, pas de réservation confirmée, pas de mission acceptée, pas de place dans le matching.
- **En-têtes** posés par [`proxy.ts`](proxy.ts) : CSP avec nonce par requête, `nosniff`, `Referrer-Policy`, `Permissions-Policy` ; Caddy ajoute HSTS en production.
- **E-mails simulés** : sans `RESEND_API_KEY`, les e-mails sont listés dans `/admin/emails` (liens de vérification compris).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests (calcul du devis, matching, colonnes de leads, limites de tentatives, parcours complet sur PGlite) |
| `npx playwright install chromium` puis `npm run build && npm run test:e2e` | Tests de bout en bout sur le build de production : parcours de réservation, sécurité (CSP, limites, vérification d'e-mail) et accessibilité axe WCAG 2.1 AA |
| `npm run lint` · `npm run typecheck` | Qualité |
| `npm run build` | Build de production (`output: standalone`) |
| `npm run db:generate` | Génère une migration après modification de `db/schema.ts` |
| `npm run db:migrate` | Applique les migrations sur `DATABASE_URL` (aussi fait au démarrage) |
| `npm run admin:create -- email "mot de passe" Prénom Nom` | Crée le premier administrateur |

## Production (VPS + Supabase)

1. **Supabase** (région UE) : récupérer `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ; créer les buckets Storage `private` (privé) et `public` (public). L'application se connecte en direct à Postgres : RLS n'est pas utilisée par l'application, laissez-la activée sans règle pour bloquer l'API publique de Supabase.
2. **Stripe Connect** : clé secrète, webhook vers `https://<domaine>/api/stripe/webhook` (événements `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`).
3. **SIRENE** (facultatif) : clé `INSEE_API_KEY` de l'API Sirene de l'INSEE ; sans elle, ou en cas de panne de l'INSEE, les SIRET sont vérifiés via l'API publique Recherche d'entreprises.
4. **Resend** (domaine vérifié), **HubSpot** (application publique, redirection `https://<domaine>/api/crm/hubspot/callback`, portées `crm.objects.contacts.write` et `.read`), **Anthropic** (lecture des cartes).
5. **VPS** : Docker, dossier `/opt/standby/staging` avec `deploy/docker-compose.yml`, `deploy/Caddyfile` et un `.env` (modèle : [`.env.example`](.env.example), droits 600).
6. **GitHub** : environnement `staging` avec la variable `VPS_PATH` et les secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_PULL_USER`, `GHCR_PULL_TOKEN`. Chaque push sur `main` validé par la CI construit l'image, la publie sur ghcr.io et la déploie.
7. Créer l'administrateur depuis votre poste, avec les variables de production (`DATABASE_URL`, `SUPABASE_*`) dans l'environnement : `npm run admin:create -- email "mot de passe" Prénom Nom`.

## À compléter avant l'ouverture

- Textes légaux : les passages surlignés `[…]` (éditeur, hébergeur, délais, barème d'annulation, DPO) avec votre avocat.
- Statut des commerciaux (risque de requalification), mandat de facturation, obligations de plateforme (DAC7).
- Accord des organisateurs avant d'afficher leurs logos (case dédiée dans l'admin).
- Calendrier réel des salons : les événements de démonstration ne sont pas « vérifiés ».
