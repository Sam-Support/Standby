# Mise en ligne de Standby : ce qu'il reste à faire à la main

Le code est prêt : parcours, espaces entreprise et commercial, administration, trois langues, e-mails, factures.
La version mobile est revue. Les tests sont au vert : 102 tests unitaires et les tests de bout en bout, mobile
compris.

L'application est hébergée sur **Vercel** (site et tâches planifiées) et **Supabase** (base Postgres, fichiers,
authentification), tous deux en Europe (Francfort). Il n'y a ni serveur à administrer ni conteneur à redémarrer :
chaque fusion dans `main` est mise en ligne, et chaque pull request a son adresse d'aperçu.

Ce guide liste, dans l'ordre, ce qu'une personne doit faire : créer les comptes chez les prestataires,
renseigner les secrets, compléter les textes juridiques, puis faire une dernière recette. Comptez une journée,
hors délais de validation (DNS, Stripe, avocat).

Dans les exemples, **`standby.fr`** remplace votre nom de domaine.

> Cochez au fur et à mesure. Chaque étape indique **où** agir et **comment vérifier** qu'elle est faite.

---

## Étape 0 : avant de commencer

- [ ] **Double authentification activée** sur tous les comptes qui vont servir : GitHub, registraire du domaine,
      Vercel, Supabase, Stripe, Resend.
- [ ] **Gestionnaire de mots de passe** prêt : vous allez générer une dizaine de secrets.
- [ ] **Machine de travail** avec le dépôt cloné et `npm ci` lancé, pour créer l'administrateur à l'étape 7.
- [ ] **À portée de main** : SIRET et adresse de la société éditrice, coordonnées du support, identité du
      directeur de la publication.

---

## Étape 1 : le code dans `main`

Fait le 5 novembre 2026 : tout le travail est dans `main` (PR #7), les PR intermédiaires sont fermées. Reste la PR
du passage sur Vercel : attendez la CI verte, vérifiez son adresse d'aperçu, fusionnez. **Chaque fusion dans
`main` est ensuite mise en production** dès que le projet Vercel existe (étape 2).

**Vérification** : l'onglet *Actions* de GitHub montre la CI verte sur `main`.

---

## Étape 2 : Vercel (le projet et le domaine)

Deux environnements Vercel servent : **Production** (la branche `main`, votre domaine) et **Preview** (une adresse
par pull request). Chacun a ses propres variables et son propre projet Supabase (étape 4).

1. **Le projet** : sur [vercel.com/new](https://vercel.com/new), importez le dépôt GitHub `Sam-Support/Standby`.
   Vercel reconnaît Next.js et lit `vercel.json` (région Francfort, migrations à la construction, tâche planifiée).
   Laissez-le créer le projet ; le premier déploiement échouera tant que les variables de l'étape 6 ne sont pas
   renseignées, c'est attendu. Si Claude a déjà créé le projet, il apparaît dans votre tableau de bord.
2. **Le domaine** : *Project → Settings → Domains*, ajoutez `standby.fr` et `www.standby.fr`. Vercel affiche les
   enregistrements DNS à créer chez votre registraire (en général un `A` vers `76.76.21.21` pour `standby.fr`
   et un `CNAME` vers `cname.vercel-dns.com` pour `www`). Le certificat HTTPS est obtenu seul.
3. **Protection des aperçus** : *Settings → Deployment Protection*, laissez *Vercel Authentication* activée
   sur les aperçus : seuls les membres connectés à Vercel voient les adresses de pull request.
4. **Offre** : l'offre gratuite (Hobby) suffit pour démarrer : la tâche planifiée toutes les 15 min est
   acceptée. Passez à Pro (20 $/mois) si vous voulez plusieurs membres d'équipe, des journaux conservés plus
   longtemps ou une protection par mot de passe.

**Vérification** : dans *Settings → Domains*, `standby.fr` est marqué *Valid Configuration*.

---

## Étape 3 : les secrets de l'application

Ils sont déjà en place dans Vercel (générés le 12 novembre 2026, un jeu pour Production, un autre pour Preview,
marqués sensibles). Pour les renouveler un jour, générez-les sur votre poste et remplacez-les dans Vercel à
l'étape 6. Ne les mettez jamais dans le dépôt.

| Variable | Commande | Rôle |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -base64 48` | signe les sessions et les liens d'e-mail. **Obligatoire** : sans lui, l'application refuse de démarrer en production |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` | chiffre les jetons HubSpot |
| `CRON_SECRET` | `openssl rand -hex 32` | protège les tâches planifiées ; Vercel l'envoie de lui-même à chaque exécution |

Si l'un d'eux est changé plus tard, tout le monde est déconnecté (et les jetons HubSpot sont à refaire pour
`ENCRYPTION_KEY`).

---

## Étape 4 : la base et le stockage (Supabase)

Deux projets existent déjà dans l'organisation Supabase « Standby », tous deux à **Francfort** (`eu-central-1`),
avec leurs buckets **`private`** (pièces d'identité, RIB, leads) et **`public`** (logos des salons) :

| Projet Supabase | Référence | Sert à |
|---|---|---|
| Production | `wdtjojycylemjgthbafg` | l'environnement Vercel **Production** (`standby.fr`) |
| `standby-staging` | `jorsocbnxfzkohnjemss` | l'environnement Vercel **Preview** (aperçus de pull request) |

Pour chacun, récupérez quatre valeurs (à coller dans Vercel à l'étape 6) :

1. **Mot de passe de la base** : si vous ne l'avez pas, *Project Settings → Database → Reset database password*.
   Le projet `standby-staging` a été créé sans vous le communiquer : réinitialisez-le une fois.
2. **Chaînes de connexion** : bouton *Connect* en haut du tableau de bord.
   - onglet **Transaction pooler** (port `6543`) → `DATABASE_URL` : c'est la connexion de l'application ;
   - onglet **Session pooler** (port `5432`) → `DATABASE_URL_DIRECT` : c'est celle des migrations.
   Remplacez `[YOUR-PASSWORD]` par le mot de passe et ajoutez `?sslmode=require` à la fin.
3. **Clés d'API** : *Project Settings → API Keys*. `SUPABASE_URL` est l'URL du projet ; copiez la clé
   **publishable** (`sb_publishable_…`) dans `SUPABASE_ANON_KEY` et créez une clé **secret** (`sb_secret_…`) pour
   `SUPABASE_SERVICE_ROLE_KEY`. La seconde est un secret : seul le serveur l'utilise.
4. Laissez la sécurité au niveau des lignes (*RLS*) **activée, sans règle**. L'application se connecte
   directement à Postgres ; RLS bloque l'API publique de Supabase.

Vérifiez les sauvegardes de votre offre (quotidiennes sur Pro, avec restauration à un instant donné en option).

Les migrations s'appliquent **à chaque construction sur Vercel**, avant la mise en ligne de la version : une base
vide reçoit toutes les tables au premier déploiement. La production démarre sans données de démonstration.

---

## Étape 5 : les prestataires

### 5.1 E-mails (Resend), obligatoire

Le pas à pas complet est dans [`docs/05-EMAILS.md`](05-EMAILS.md). En résumé :

- [ ] Domaine d'envoi ajouté chez Resend (`notifications.standby.fr`), **région Irlande**.
- [ ] Enregistrements DNS DKIM et SPF copiés exactement depuis l'onglet *Records*, puis domaine **vérifié**.
- [ ] DMARC `p=none` ajouté sur `_dmarc.standby.fr`.
- [ ] Clé d'API limitée à l'envoi, webhook vers `https://standby.fr/api/resend/webhook`.
- [ ] Variables `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SUPPORT_EMAIL`, `RESEND_WEBHOOK_SECRET`
      renseignées.

### 5.2 Paiements (Stripe Connect), obligatoire pour encaisser

1. Créez le compte Stripe de la société et activez **Connect** (comptes *Express* pour les commerciaux).
2. **Commencez en mode test.** Copiez la clé secrète de test dans `STRIPE_SECRET_KEY`.
3. Créez un webhook vers `https://standby.fr/api/stripe/webhook` avec ces événements :
   `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `refund.updated`, `refund.failed`, `account.updated`. Copiez son secret dans `STRIPE_WEBHOOK_SECRET`.
4. Activez les prélèvements **SEPA** et les cartes dans les moyens de paiement.
5. Après la recette (étape 9), passez en mode production. Il faut alors **une nouvelle clé et un nouveau
   webhook**, car ceux du mode test ne valent pas en production.

### 5.3 Facultatif, à activer quand vous en avez besoin

- **SIRENE** : `INSEE_API_KEY` (portail-api.insee.fr, application « Simple »). Sans elle, la vérification
  des SIRET passe par l'API publique Recherche d'entreprises.
- **HubSpot** (leads envoyés directement dans le CRM des exposants) : application publique avec la redirection
  `https://standby.fr/api/crm/hubspot/callback` et les portées `crm.objects.contacts.write` et `.read`.
  Renseignez `HUBSPOT_CLIENT_ID` et `HUBSPOT_CLIENT_SECRET`.
- **Lecture automatique des cartes de visite** : `ANTHROPIC_API_KEY`. Sans elle, les cartes sont saisies à la
  main depuis l'admin.

---

## Étape 6 : les variables dans Vercel et le premier déploiement

Dans *Project → Settings → Environment Variables*, ajoutez chaque variable **deux fois** : une pour
**Production**, une pour **Preview**, avec les valeurs du projet Supabase correspondant (étape 4) et des secrets
distincts (étape 3). Cochez *Sensitive* pour les secrets.

| Variable | Production | Preview |
|---|---|---|
| `APP_URL` | `https://standby.fr` | laissez vide : l'adresse de l'aperçu est déduite |
| `AUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` | déjà en place (étape 3) | déjà en place, autres valeurs |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | déjà en place | déjà en place |
| `DATABASE_URL`, `DATABASE_URL_DIRECT`, `SUPABASE_SERVICE_ROLE_KEY` | **à coller** : projet Supabase de production | **à coller** : projet `standby-staging` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SUPPORT_EMAIL`, `RESEND_WEBHOOK_SECRET` | étape 5.1 | facultatif : sans clé, les e-mails sont simulés et lisibles dans `/admin/emails` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | étape 5.2 (mode test d'abord) | facultatif : paiements simulés |
| `INSEE_API_KEY`, `HUBSPOT_*`, `ANTHROPIC_API_KEY` | étape 5.3 | facultatif |

Puis *Deployments → ⋯ sur le dernier déploiement → Redeploy*. La construction applique les migrations, puis met
la version en ligne. Les suivantes partiront seules à chaque fusion dans `main`.

**Vérification** : `https://standby.fr` s'ouvre en HTTPS, `https://standby.fr/api/health?db=1` répond
`{"ok":true,…,"db":"ok"}`, et l'onglet *Schedules* du projet montre `taches-planifiees` toutes les 15 min.

**Retour arrière** : *Deployments*, choisissez le déploiement précédent, *⋯ → Instant Rollback* (ou *Promote to
Production*). C'est immédiat, sans reconstruction.

---

## Étape 7 : le premier administrateur

Depuis votre poste, avec les variables de production dans l'environnement du terminal (`DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) :

```bash
npm run admin:create -- prenom.nom@standby.fr "un mot de passe long et unique" Prénom Nom
```

Connectez-vous ensuite sur `https://standby.fr/connexion`, puis ouvrez **`/admin`**.

- [ ] Le tableau de bord indique les services configurés : base, Stripe, Resend, et le cas échéant HubSpot et
      la lecture des cartes.
- [ ] Dans **`/admin/emails`**, le bloc *Configuration* ne signale plus de problème. Le bouton
      « M'envoyer un e-mail de test » fonctionne, et l'e-mail passe à l'état « remis ».
- [ ] Dans **`/admin/tarification`**, les frais de service, la commission, la TVA, les tarifs plancher par poste
      et le barème d'annulation sont ceux que vous voulez appliquer.

---

## Étape 8 : le contenu à compléter

### 8.1 Textes juridiques, avec votre avocat et votre expert-comptable

Tous les passages entre crochets `[…]` s'affichent surlignés en jaune sur le site, tant qu'ils ne sont pas
remplis. Où les trouver :

| Fichier | À compléter |
|---|---|
| `lib/content/legal.ts` (version qui fait foi) | éditeur (raison sociale, forme, capital, RCS, siège, SIRET, TVA), directeur de la publication, hébergeur, délais de paiement et taux des pénalités (CGV), barème d'annulation à valider, durées de conservation, DPO, mandat de facturation (délai de contestation, validation), déclaration d'accessibilité (après audit), dates de mise à jour |
| `lib/content/legal-en.ts`, `lib/content/legal-es.ts` | mêmes passages, en anglais et en espagnol (traductions à titre informatif) |
| `app/contact/page.tsx` | e-mail, téléphone, adresse et horaires du support |
| `app/entreprise/factures/[id]/page.tsx`, `app/entreprise/avoirs/[id]/page.tsx`, `app/commercial/factures/[id]/page.tsx` | raison sociale, adresse, SIRET et TVA de l'éditeur sur les factures, avoirs et autofactures ; taux des pénalités de retard |
| `app/cookies/page.tsx` | outil de mesure d'audience, si vous en ajoutez un (sinon, retirez la ligne) |

Points à faire valider par des professionnels :
- **Statut des commerciaux** indépendants (risque de requalification en salariat), avec un avocat.
- **Mandat d'autofacturation**, mentions des autofactures, TVA des indemnités d'annulation, avec
  l'expert-comptable.
- **DAC7** : l'export admin donne les montants par trimestre ; la date de naissance et le numéro fiscal des
  commerciaux ne sont pas encore collectés.

Une fois les textes modifiés, fusionnez-les dans `main` : ils sont déployés automatiquement.

### 8.2 Le calendrier des salons

- [ ] Dans **`/admin/salons`**, importez le calendrier réel (CSV : `nom;type;ville;debut;fin;montage;secteur;specialite;site`)
      ou créez les salons un par un.
- [ ] Vérifiez chaque salon sur le site de l'organisateur, puis cochez « Dates vérifiées ».
- [ ] **Logos** : ne les affichez qu'avec l'accord écrit de l'organisateur (case dédiée).
  - Format attendu : au moins 240 × 60 px (le SVG est accepté sans minimum), du carré au bandeau cinq fois
    plus large que haut, sur fond transparent ou blanc.
  - Un logo hors format, ou sans accord, est remplacé par le nom du salon sur sa couleur. La fiche du salon
    montre un aperçu et explique pourquoi.

---

## Étape 9 : la recette sur le vrai domaine (Stripe en mode test)

Faites-la sur un téléphone **et** sur un ordinateur, en français puis en anglais ou en espagnol.

- [ ] **Entreprise** : inscription d'une entreprise de test avec un vrai SIRET. L'e-mail de confirmation arrive
      (pensez aux indésirables) et le lien fonctionne.
- [ ] **Commercial** : inscription d'un commercial de test, dépôt des documents, puis validation dans
      `/admin/inscrits` et activation des virements Stripe (mode test).
- [ ] **Réservation** : réservation complète, avec une carte de test Stripe (`4242 4242 4242 4242`) ou un IBAN
      de test SEPA.
- [ ] **Mission** : le commercial reçoit l'e-mail de la mission, l'accepte, puis l'entreprise reçoit l'e-mail de
      confirmation.
- [ ] **Après l'événement** : depuis `/admin`, « Exécuter les tâches » fait avancer les statuts. Déclarez les
      heures, validez-les, puis vérifiez que la facture, l'autofacture et le virement programmé apparaissent.
- [ ] **Leads** : dépôt d'un fichier Excel de leads, puis export côté entreprise.
- [ ] **Annulation et avoir** : annulation d'une autre réservation, puis émission d'un avoir depuis l'admin.
- [ ] **E-mails** : dans les en-têtes d'un e-mail reçu, `spf=pass`, `dkim=pass` et `dmarc=pass`.
- [ ] **Compte** : mot de passe oublié, changement d'adresse e-mail, export des données depuis « Mon compte ».
- [ ] **Impression** : une facture s'imprime ou s'enregistre en PDF correctement.

Ensuite, **passez Stripe en production** (nouvelle clé et nouveau webhook, voir l'étape 5.2), redéployez
(*Deployments → Redeploy* : les variables modifiées ne sont prises en compte qu'au déploiement suivant), puis
supprimez les comptes et données de test depuis l'admin ou Supabase.

---

## Étape 10 : sécurité et exploitation avant l'ouverture

- [ ] **Actions GitHub épinglées par empreinte** : remplacez `@v4` par le SHA du commit dans
      `.github/workflows/ci.yml`.
- [ ] **Protection de `main`** : dans GitHub, *Settings → Branches*, exigez la CI verte (`check` et `e2e`) avant
      toute fusion, puisque la fusion met en production.
- [ ] **Supervision** : un service externe (UptimeRobot, Better Stack…) qui appelle
      `https://standby.fr/api/health?db=1` toutes les minutes et vous alerte après deux échecs.
- [ ] **Suivi des erreurs** : Sentry ou équivalent, recommandé ; l'intégration Vercel de Sentry s'installe depuis
      la place de marché Vercel. À défaut, les journaux d'exécution sont dans Vercel (*Project → Logs*).
- [ ] **Vercel Firewall** : en cas de trafic anormal, *Project → Firewall → Attack Challenge Mode* bloque les
      robots en un clic.
- [ ] **Test de restauration** : restaurez une sauvegarde Supabase dans un projet de test.
- [ ] **Test d'intrusion** par un prestataire, recommandé avant d'accueillir de vraies pièces d'identité.
- [ ] **DMARC** : après deux à quatre semaines sans échec dans les rapports, passez à `p=quarantine`, puis à
      `p=reject`.

---

## Au quotidien

| Besoin | Où |
|---|---|
| Inscriptions et documents à valider | `/admin/inscrits` |
| Réservations, arbitrage des heures, avoirs | `/admin/reservations` |
| Paiements, virements, autofactures, export DAC7 | `/admin/finances` |
| Cartes de visite à saisir | `/admin/cartes` |
| Avis à modérer, messages de contact | `/admin/avis`, `/admin/messages` |
| E-mails envoyés, rebonds, adresses en échec | `/admin/emails` |
| Journaux de l'application | Vercel : *Project → Logs* (requêtes, erreurs, sortie des fonctions) |
| Tâches planifiées (toutes les 15 min) | Vercel : *Project → Schedules → taches-planifiees* (historique des exécutions) ; relance manuelle depuis `/admin` |
| Mettre en ligne, revenir en arrière | Vercel : *Project → Deployments* (chaque fusion dans `main` déploie ; *Instant Rollback* pour revenir) |

Documents de référence : [`README.md`](../README.md) (fonctionnement), [`docs/05-EMAILS.md`](05-EMAILS.md)
(e-mails), [`.10x/reviews/`](../.10x/reviews/) (revues de sécurité et de qualité).
