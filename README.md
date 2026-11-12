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
- **Réservation en 5 étapes** (« Nouvelle réservation » reprend le dernier brouillon resté vide plutôt que d'en créer un à chaque visite) : événement (jours, montage, horaires, stand) → équipe (postes, langues, tenue, estimation en direct) → brief (référent, plaquette, format des leads) → profils (matching pondéré, favoris, re-sélection) → récap et devis → confirmation.
- **Espace entreprise** : réservations et acceptations, heures à valider ou ajuster, leads reçus au format du template (export Excel ou envoi HubSpot), factures, profil.
- **Espace commercial** : missions à accepter ou refuser, déclaration des heures, dépôt des leads (Excel avec rapprochement automatique des colonnes, photos de cartes lues par Claude), revenus et virements du lundi, documents.
- **Admin** (`/admin`) : tableau de bord et commissions, salons et foires (logos, import CSV, dates vérifiées), **tarification versionnée** (frais de service, commission, TVA, planchers par poste, majoration tenue), validation des documents, arbitrage des heures, finances, saisie des cartes, messages.
- **Annulation** : barème réglable dans l'admin (par défaut gratuit à 14 jours ou plus, 30 % de 7 à 13 jours, 50 % de 2 à 6 jours, 100 % ensuite). Le montant exact est affiché avant de confirmer ; les frais sont facturés et les commerciaux déjà engagés reçoivent la même part en indemnité. L'admin peut annuler sans frais.
- **Désistement** : jusqu'à la veille du premier jour, un commercial peut se désister d'une mission acceptée (motif transmis à l'équipe seulement). Un remplaçant reçoit aussitôt la mission (au même tarif ou moins en priorité), l'exposant et l'admin sont prévenus ; sans remplaçant ou à J-2, l'admin reçoit aussi un e-mail. Le désistement compte comme un refus dans le taux d'acceptation.
- **Heures contestées** : si l'exposant retient moins d'heures que déclaré (avec un motif), le commercial a 48 h pour accepter ou contester ; sans réponse, l'ajustement est retenu. Une contestation part en arbitrage dans l'admin, dont la décision est définitive. La facture attend que toutes les heures soient validées.
- **Avoirs et remboursements** (admin, fiche réservation) : avoir numéroté `A-AAAA-NNNNN` sur une facture, plafonné au reste à créditer. Facture réglée : remboursement Stripe (suivi par webhook, relance ou « remboursé par virement » en cas d'échec) ; sinon, déduit du prélèvement. La paie des commerciaux n'est pas modifiée ; le CA et les commissions affichés sont nets des avoirs.
- **Factures des commerciaux (autofacturation)** : à l'inscription (étape 4) ou dans le profil, le commercial renseigne son adresse de facturation et son régime de TVA et accepte le mandat de facturation (page `/mandat-facturation`) ; sans mandat, pas de mission. À chaque virement (mission ou indemnité d'annulation), Standby émet une facture à son nom : mention « Autofacturation », numérotation propre `AF-XXXXXXXX-AAAA-NNNN`, coordonnées figées à l'émission, « TVA non applicable, art. 293 B du CGI » en franchise, TVA à 20 % ajoutée et versée s'il est assujetti. `/commercial/revenus` regroupe les factures par mois de virement, avec relevé mensuel, récapitulatif annuel par trimestre et export CSV. L'admin voit les autofactures dans `/admin/finances` et exporte les sommes versées par trimestre (base DAC7).
- **Identité des entreprises** : adresse de facturation obligatoire (sans elle, pas de réservation) et n° de TVA intracommunautaire (calculé à partir du SIREN si vide). Le SIRET n'est « vérifié » que si l'établissement est actif et que le nom SIRENE concorde avec la raison sociale ; sinon l'équipe est prévenue et confirme l'identité depuis `/admin/inscrits`. Les factures figent les coordonnées du client à l'émission et indiquent l'échéance (prélèvement à l'émission).
- **Compte** (`/compte`) : changement de mot de passe (l'actuel est exigé, les autres appareils sont déconnectés) et d'adresse e-mail (lien de confirmation envoyé à la nouvelle adresse, alerte sur l'ancienne).
- **Avis** : après validation des heures, l'exposant note chaque membre de l'équipe (1 à 5 et commentaire) ; la moyenne alimente le matching, le commercial voit ses avis, l'admin modère (`/admin/avis`).
- **Rappels** : J-7 (badges à demander pour l'équipe Standby, point d'équipe pour l'exposant et les commerciaux) et J-2 (briefing avec le référent, coordonnées), un seul envoi chacun.
- **RGPD** (`/compte`) : export JSON de toutes ses données, suppression du compte (refusée tant qu'une réservation, une mission ou un paiement est en cours ; pièces comptables conservées 10 ans sur un profil anonymisé), purge automatique des leads après la durée réglée dans l'admin (365 jours par défaut).
- **Langues** : français (adresses sans préfixe), anglais (`/en/…`) et espagnol (`/es/…`), sélecteur FR · EN · ES dans l'en-tête. À la première visite, la langue du navigateur décide ; le choix est ensuite mémorisé (cookie `standby_lang`, un an) et `?lang=fr` ramène au français. Les textes sont dans [`lib/i18n/messages`](lib/i18n/messages) (un fichier par espace, même forme imposée par le typage dans les trois langues) ; les erreurs et confirmations du serveur restent écrites en français dans le code et sont traduites par le catalogue [`feedback.ts`](lib/i18n/messages/feedback.ts), indexé sur le texte français. Notifications et e-mails partent dans la langue du compte du destinataire (`profiles.locale`, mise à jour quand il navigue dans une autre langue), avec des liens préfixés ([`notices.ts`](lib/i18n/messages/notices.ts)). Les textes légaux ont une version anglaise et espagnole à titre informatif (seule la version française fait foi) ; les factures, avoirs et autofactures restent en français, traduction affichée sous chaque mention. L'administration reste en français.
- **Automatismes** (`/api/cron`, toutes les 15 min en production) : début et fin d'événement, expiration des propositions à 48 h avec remplaçant automatique, rappels J-7 et J-2, validation des heures à J+3, ajustements d'heures sans réponse retenus à 48 h, virements dus, purge des données arrivées à échéance.

## Sécurité

- **Limites de tentatives** (comptées en base) : connexion (8 échecs par e-mail et 50 tentatives par IP sur 15 min), mot de passe oublié, contact, inscription, renvoi du lien de vérification. Réglages dans [`lib/rate-limit.ts`](lib/rate-limit.ts).
- **Formulaires** : une erreur serveur ne vide plus les champs (envoi par `onSubmit`, l'action reste disponible sans JavaScript) et le message d'erreur est ramené à l'écran ; les confirmations s'affichent en haut de page, même quand le formulaire disparaît (`components/flash.tsx`). Toute annulation de réservation demande une case de confirmation.
- **Vérification de l'e-mail** à l'inscription (lien signé, 48 h) : sans elle, pas de réservation confirmée, pas de mission acceptée, pas de place dans le matching.
- **En-têtes** posés par [`proxy.ts`](proxy.ts) : CSP avec nonce par requête, `nosniff`, `Referrer-Policy`, `Permissions-Policy` ; HSTS et `X-Frame-Options` dans [`next.config.ts`](next.config.ts).
- **E-mails** : sans `RESEND_API_KEY`, les e-mails sont simulés et listés dans `/admin/emails` (liens de vérification compris). Avec Resend, ce journal suit chaque envoi jusqu'à la remise (webhook signé), signale rebonds et plaintes, et l'utilisateur concerné est averti dans « Mon compte » ([`docs/05-EMAILS.md`](docs/05-EMAILS.md)).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests (calcul du devis, matching, colonnes de leads, limites de tentatives, parcours complet sur PGlite) |
| `npx playwright install chromium` puis `npm run build && npm run test:e2e` | Tests de bout en bout sur le build de production : parcours de réservation, désistement, heures contestées et avoir, changement de mot de passe et d'e-mail, sécurité (CSP, limites, vérification d'e-mail) et accessibilité axe WCAG 2.1 AA |
| `npm run lint` · `npm run typecheck` | Qualité |
| `npm run build` | Build de production (`output: standalone`) |
| `npm run db:generate` | Génère une migration après modification de `db/schema.ts` |
| `npm run db:migrate` | Applique les migrations sur `DATABASE_URL` (aussi fait au démarrage) |
| `npm run admin:create -- email "mot de passe" Prénom Nom` | Crée le premier administrateur |

## Production (Vercel + Supabase)

Guide pas à pas de la mise en ligne (comptes, secrets, DNS, textes juridiques, recette) : [`docs/06-MISE-EN-LIGNE.md`](docs/06-MISE-EN-LIGNE.md).
Ce qui reste à faire, par ordre et par responsable : [`docs/07-A-FAIRE.md`](docs/07-A-FAIRE.md). Pourquoi Vercel : [`.10x/adrs/003-hebergement-vercel.md`](.10x/adrs/003-hebergement-vercel.md).

1. **Supabase** (région UE, un projet pour la production, un pour les aperçus) : récupérer `DATABASE_URL` (pooler en mode transaction), `DATABASE_URL_DIRECT` (pooler en mode session, pour les migrations), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ; buckets Storage `private` (privé) et `public` (public). L'application se connecte en direct à Postgres : RLS n'est pas utilisée par l'application, laissez-la activée sans règle pour bloquer l'API publique de Supabase.
2. **Stripe Connect** : clé secrète, webhook vers `https://<domaine>/api/stripe/webhook` (événements `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `refund.updated`, `refund.failed`, `account.updated`).
3. **SIRENE** (facultatif) : clé `INSEE_API_KEY` de l'API Sirene de l'INSEE ; sans elle, ou en cas de panne de l'INSEE, les SIRET sont vérifiés via l'API publique Recherche d'entreprises.
4. **Resend** : domaine d'envoi vérifié (région Irlande), DNS SPF/DKIM puis DMARC, clé d'API, webhook vers `https://<domaine>/api/resend/webhook` ; pas à pas dans [`docs/05-EMAILS.md`](docs/05-EMAILS.md), puis e-mail de test depuis `/admin/emails`. **HubSpot** (application publique, redirection `https://<domaine>/api/crm/hubspot/callback`, portées `crm.objects.contacts.write` et `.read`), **Anthropic** (lecture des cartes).
5. **Vercel** : projet relié au dépôt GitHub ; [`vercel.json`](vercel.json) fixe la région (Francfort), les migrations à la construction (`npm run db:migrate && npm run build`) et le Schedule `/api/cron` toutes les 15 min. Variables à renseigner pour *Production* et pour *Preview* (modèle : [`.env.example`](.env.example)). Chaque fusion dans `main` met en production ; chaque pull request a son aperçu.
6. Créer l'administrateur depuis votre poste, avec les variables de production (`DATABASE_URL`, `SUPABASE_*`) dans l'environnement : `npm run admin:create -- email "mot de passe" Prénom Nom`.

## À compléter avant l'ouverture

- Textes légaux : les passages surlignés `[…]` (éditeur, hébergeur, délais, barème d'annulation, DPO) avec votre avocat.
- Statut des commerciaux (risque de requalification).
- Factures : l'échéance affichée est la date d'émission (prélèvement automatique) ; aligner la clause « exigible sous [délai] jours » des CGV.
- Autofacturation : faire valider le texte du mandat (`lib/content/legal.ts`, `MANDAT_FACTURATION`), les mentions des autofactures, le traitement de la TVA des indemnités d'annulation et la facturation de la commission plateforme si elle devient non nulle ; compléter l'identité de l'éditeur sur les documents (passages `[…]`).
- DAC7 : l'export admin donne les montants et commissions par trimestre ; la date de naissance et le numéro fiscal des commerciaux personnes physiques ne sont pas encore collectés.
- Accord des organisateurs avant d'afficher leurs logos (case dédiée dans l'admin).
- Calendrier réel des salons : les événements de démonstration ne sont pas « vérifiés ».
