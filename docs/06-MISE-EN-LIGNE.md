# Mise en ligne de Standby : ce qu'il reste à faire à la main

Le code est prêt : parcours, espaces entreprise et commercial, administration, trois langues, e-mails, factures.
La version mobile est revue. Les tests sont au vert : 102 tests unitaires et les tests de bout en bout, mobile
compris.

Ce guide liste, dans l'ordre, ce qu'une personne doit faire : créer les comptes chez les prestataires,
renseigner les secrets, compléter les textes juridiques, puis faire une dernière recette. Comptez une à deux
journées, hors délais de validation (DNS, Stripe, avocat).

Dans les exemples, **`standby.fr`** remplace votre nom de domaine.

> Cochez au fur et à mesure. Chaque étape indique **où** agir et **comment vérifier** qu'elle est faite.

---

## Étape 0 : avant de commencer

- [ ] **Double authentification activée** sur tous les comptes qui vont servir : GitHub, registraire du domaine,
      hébergeur du VPS, Supabase, Stripe, Resend.
- [ ] **Gestionnaire de mots de passe** prêt : vous allez générer une dizaine de secrets.
- [ ] **Machine de travail** avec le dépôt cloné et `npm ci` lancé, pour créer l'administrateur à l'étape 7.
- [ ] **À portée de main** : SIRET et adresse de la société éditrice, coordonnées du support, identité du
      directeur de la publication.

---

## Étape 1 : fusionner le code dans `main`

Le travail est réparti sur plusieurs branches. Les dernières (`fix/recette`, `feat/i18n`) ne sont pas encore
publiées sur GitHub. **Fusionner dans `main` déclenche le déploiement** dès que le VPS est configuré (étape 6).

1. Publiez les branches restantes et ouvrez les pull requests dans l'ordre de la chaîne, ou demandez-le à Claude.
2. Pour chaque PR, attendez la CI verte : lint, types, tests, build et tests de bout en bout.
3. Fusionnez dans `main` dans l'ordre.

**Vérification** : l'onglet *Actions* de GitHub montre la CI verte sur `main`.

---

## Étape 2 : le serveur (VPS)

1. **DNS du site** : chez le registraire, créez un enregistrement `A` (et `AAAA` si le VPS a une IPv6) pour
   `standby.fr` vers l'adresse IP du VPS. Caddy obtiendra seul le certificat HTTPS.
2. **Système** : connectez-vous en SSH, mettez le système à jour, installez Docker et le plugin Compose, puis
   ouvrez uniquement les ports 22, 80 et 443 :
   ```bash
   sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
   ```
3. **Dossier de l'application** :
   ```bash
   sudo mkdir -p /opt/standby/staging && sudo chown $USER /opt/standby/staging
   ```
   Copiez-y `deploy/docker-compose.yml` et `deploy/Caddyfile` depuis le dépôt.
4. **Fichier `.env`** : créez-le dans ce dossier à partir de `.env.example` (les valeurs viennent des étapes 3
   à 5), puis protégez-le :
   ```bash
   chmod 600 /opt/standby/staging/.env
   ```
   Renseignez dès maintenant `DOMAIN=standby.fr` et `APP_URL=https://standby.fr`.

**Vérification** : `ping standby.fr` répond avec l'IP du VPS.

---

## Étape 3 : les secrets de l'application

Générez-les sur votre poste et collez-les dans le `.env` du VPS. Ne les mettez jamais dans le dépôt.

| Variable | Commande | Rôle |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -base64 48` | signe les sessions et les liens d'e-mail. **Obligatoire** : sans lui, l'application refuse de démarrer en production |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` | chiffre les jetons HubSpot |
| `CRON_SECRET` | `openssl rand -hex 32` | protège les tâches planifiées |

Si l'un d'eux est changé plus tard, tout le monde est déconnecté (et les jetons HubSpot sont à refaire pour
`ENCRYPTION_KEY`).

---

## Étape 4 : la base et le stockage (Supabase)

1. Créez un projet Supabase en **région Union européenne** (Francfort ou Paris).
2. Dans *Project Settings → Database*, copiez la chaîne de connexion (mode *session*) dans `DATABASE_URL`.
3. Dans *Project Settings → API*, copiez `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`.
   La dernière est un secret : seul le serveur l'utilise.
4. Dans *Storage*, créez deux buckets : **`private`** (privé : pièces d'identité, RIB, leads) et **`public`**
   (public : logos des salons).
5. Laissez la sécurité au niveau des lignes (*RLS*) **activée, sans règle**. L'application se connecte
   directement à Postgres ; RLS bloque l'API publique de Supabase.
6. Vérifiez les sauvegardes de votre offre, et si possible la restauration à un instant donné (PITR).

Les migrations s'appliquent seules au démarrage de l'application. La base de production démarre vide (pas de
données de démonstration).

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

## Étape 6 : le déploiement automatique (GitHub)

1. Dans *Settings → Environments* du dépôt, créez l'environnement **`staging`**.
2. Ajoutez la **variable** `VPS_PATH` = `/opt/standby/staging`.
3. Ajoutez les **secrets** :
   - `VPS_HOST`, `VPS_USER` : adresse et utilisateur SSH du VPS ;
   - `VPS_SSH_KEY` : clé privée d'une paire dédiée au déploiement, dont la clé publique est dans
     `~/.ssh/authorized_keys` sur le VPS ;
   - `GHCR_PULL_USER`, `GHCR_PULL_TOKEN` : compte GitHub et jeton *classic* avec la seule permission
     `read:packages`, pour que le VPS télécharge l'image.
4. Lancez le workflow **Deploy** à la main (*Actions → Deploy → Run workflow*). Les suivants partiront seuls à
   chaque fusion dans `main` validée par la CI.

**Vérification** : `https://standby.fr` s'ouvre en HTTPS, et `https://standby.fr/api/health?db=1` répond
`{"ok":true,…,"db":"ok"}`.

**Retour arrière** : si une version pose problème, relancez la précédente sur le VPS.
```bash
cd /opt/standby/staging && IMAGE_TAG=<sha du commit précédent> docker compose up -d app
```

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

Ensuite, **passez Stripe en production** (nouvelle clé et nouveau webhook, voir l'étape 5.2), redémarrez le
conteneur, puis supprimez les comptes et données de test depuis l'admin ou Supabase.

---

## Étape 10 : sécurité et exploitation avant l'ouverture

- [ ] **Actions GitHub épinglées par empreinte** : remplacez `@v4` par le SHA du commit dans
      `.github/workflows/*.yml`.
- [ ] **Supervision** : un service externe (UptimeRobot, Better Stack…) qui appelle
      `https://standby.fr/api/health?db=1` toutes les minutes et vous alerte après deux échecs.
- [ ] **Suivi des erreurs** : Sentry ou équivalent, recommandé.
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
| Journaux de l'application | sur le VPS : `cd /opt/standby/staging && docker compose logs -f app` |
| Tâches planifiées (toutes les 15 min) | `docker compose logs cron` ; relance manuelle depuis `/admin` |

Documents de référence : [`README.md`](../README.md) (fonctionnement), [`docs/05-EMAILS.md`](05-EMAILS.md)
(e-mails), [`.10x/reviews/`](../.10x/reviews/) (revues de sécurité et de qualité).
