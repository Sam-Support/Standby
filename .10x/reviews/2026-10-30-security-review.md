# Revue de sécurité — 30 octobre 2026

**Périmètre** : tout le dépôt sur `feat/i18n`, soit l'application Next.js 16 (App Router, actions serveur et
`proxy.ts`), les services, la base (Drizzle, Postgres ou PGlite), le stockage, les intégrations (Stripe Connect,
Resend, HubSpot, SIRENE, Claude), le déploiement (Docker, Caddy, GitHub Actions) et les dépendances.

**Méthode** : grille OWASP Top 10 (plugins 10x-Team *security-engineer* et engineering *code-review*).
Lecture de toutes les routes et actions serveur, vérification de la propriété des objets dans les services,
puis tests de non-régression (`lib/security.test.ts`).

## Modèle de menace

| Élément | Détail |
|---|---|
| Actifs | pièces d'identité, RIB, attestations URSSAF ; coordonnées et leads des exposants ; factures et virements ; comptes administrateur |
| Adversaires | visiteur anonyme ; utilisateur inscrit (exposant ou commercial) qui cherche à lire ou modifier les données d'un autre, ou à devenir admin ; tiers qui reçoit un e-mail qui ne lui était pas destiné ; contributeur externe (PR) |
| Points d'entrée | pages et actions serveur (les arguments liés par `bind` reviennent du navigateur), routes `/api/*`, dépôts de fichiers, liens d'e-mail, webhooks Stripe et Resend, retour OAuth HubSpot, exports CSV et Excel |
| Cadre légal | RGPD (documents d'identité, données bancaires), obligations comptables |

## Constats et corrections

| # | Gravité | Constat | Correction |
|---|---|---|---|
| S1 | **ÉLEVÉE** | Les pages `/admin/*` ne vérifiaient le rôle que dans `app/admin/layout.tsx`. Next ne réexécute pas un layout lors d'une navigation côté client, et l'en-tête qui l'indique peut être forgé. Un utilisateur connecté (commercial ou exposant) pouvait donc obtenir le rendu d'une page admin : inscrits, finances, journal des e-mails. Les actions admin, elles, étaient protégées. | `await requireAdmin()` en tête des 13 pages ; un test vérifie que toute nouvelle page admin le fait. |
| S2 | MOYENNE | Un même format de jeton signé servait à la session, à la confirmation d'adresse, au changement d'adresse et à HubSpot. Un lien de confirmation (48 h) ou de changement d'adresse (24 h), collé dans le cookie de session, ouvrait une session au nom de l'utilisateur tant qu'il n'avait pas changé de mot de passe. | Jetons liés à leur usage : HMAC sur « usage.corps » et `verifyToken(jeton, usage)` obligatoire. **Effet du déploiement : toutes les sessions sont fermées une fois.** |
| S3 | MOYENNE | Redirection ouverte. `safeNext` acceptait `/\evil.example`, que les navigateurs lisent comme `//evil.example` : `/connexion?next=/\evil.example` renvoyait vers un autre site après la connexion (hameçonnage). | Chemin interne strict : ni `//`, ni `/\`, ni barre oblique inverse, espace ou caractère de contrôle. Même garde dans `localizePath`. |
| S4 | MOYENNE | Injection de formules dans les exports CSV (DAC7 côté admin, factures côté commercial). Un nom ou une adresse commençant par `=`, `+`, `-` ou `@` s'exécutait à l'ouverture dans Excel. | Ces cellules sont préfixées d'une apostrophe ; les montants négatifs restent des nombres. |
| S5 | MOYENNE | En production avec `DB_DRIVER=pglite` et sans `AUTH_SECRET`, l'application prenait un secret connu de tous, ce qui permettait de forger des sessions. | `AUTH_SECRET` est obligatoire en production. Seule exception : `ALLOW_DEV_SECRET=1`, explicite. Les tests de bout en bout ont leur propre secret. |
| S6 | MOYENNE | Les jetons de réinitialisation de mot de passe étaient stockés en clair, si bien qu'une fuite de la base donnait des liens valables une heure. Deux envois simultanés du même lien passaient aussi tous les deux. | Seule l'empreinte SHA-256 est stockée, et le lien est consommé par un seul `UPDATE … RETURNING`. |
| S7 | FAIBLE | `/api/fichiers` décodait les segments deux fois et acceptait la barre oblique inverse. Sous Windows, en stockage local, elle sert de séparateur ; une clé invalide provoquait aussi une erreur 500. Pas de fuite constatée : le stockage refusait déjà `..`. | Segments déjà décodés par Next utilisés tels quels ; `.`, `..`, `/`, `\` et caractères de contrôle refusés ; réponse 404 en cas d'erreur. |
| S8 | FAIBLE | Le type de document envoyé par `uploadDocAction` (argument lié, donc modifiable) n'était pas contrôlé. | Contrôle du type par rapport à `DOCUMENT_TYPES`. |
| S9 | FAIBLE | Un exposant ou un commercial pouvait sauter des étapes d'inscription en appelant directement l'étape 4. | Refus si l'étape demandée dépasse l'étape atteinte. |
| S10 | FAIBLE | Le lien « site officiel » d'un salon n'était pas limité à http(s). React 19 bloque déjà `javascript:`. | Validation http(s) à l'enregistrement et à l'import CSV. |
| S11 | FAIBLE | Le déploiement se déclenchait après toute CI réussie dont la branche s'appelait `main`, y compris une PR venue d'un fork. Le code déployé restait celui du dépôt. | Déploiement seulement après une CI déclenchée par un push. |

## Contrôles vérifiés, sans écart

- **Propriété des objets** : chaque action serveur revérifie que la réservation ou la mission appartient à
  l'utilisateur (`getCompanyBooking`, `row.f.userId === …`, `companyId` sur les heures et les avis). Les
  arguments liés ne sont donc pas exploitables.
- **Fichiers privés** : accès réservé à l'entreprise, à son équipe et au commercial concerné (leads et cartes :
  seulement leur auteur). Les SVG sont servis avec une CSP `default-src 'none'`, et toutes les réponses avec
  `nosniff`.
- **Injection SQL** : toutes les requêtes passent par Drizzle, et les fragments `sql\`` sont paramétrés.
  Aucun `dangerouslySetInnerHTML`.
- **Sessions** : cookie `httpOnly`, `secure` en production, `SameSite=Lax`. Changement de mot de passe et
  réinitialisation ferment les autres sessions (`sessionVersion`). Mots de passe en scrypt, en local, sinon
  dans Supabase Auth.
- **Limites de tentatives** : connexion, mot de passe oublié, contact, inscription, renvoi du lien, changement
  d'adresse.
- **Webhooks** : Stripe vérifié par le SDK. Resend vérifié par la signature Svix, contrôlée avec l'exemple
  officiel, avec une fenêtre de 5 min contre le rejeu.
- **Secrets** : aucun dans le dépôt. Jetons HubSpot chiffrés en AES-256-GCM. Cron protégé par une comparaison
  à temps constant.
- **En-têtes** : CSP avec nonce, `frame-ancestors 'none'`, HSTS côté Caddy, `Referrer-Policy`,
  `Permissions-Policy`. Image Docker sans root.
- **CSRF** : les actions serveur ont la vérification d'origine de Next. Les routes GET qui modifient l'état
  exigent un jeton (`/verifier-email`, `/nouvelle-adresse`), sauf `/reserver/nouveau`, qui ne crée qu'un
  brouillon vide pour l'exposant connecté.

## Risques acceptés ou à suivre

- **Dépendances** : `npm audit` signale `uuid` < 11.1.1 (modéré), via `exceljs`. La faille porte sur v3, v5
  et v6 avec un tampon fourni, ce qu'exceljs n'utilise pas. Le correctif proposé rétrograde exceljs en 3.4 :
  ne pas l'appliquer, surveiller une version d'exceljs à jour.
- **Déconnexion** : elle supprime le cookie, mais le jeton reste valable jusqu'à son expiration (30 jours)
  s'il a été copié. Pour fermer toutes les sessions, il faut changer de mot de passe.
- **Mode e-mails simulé** : sans clé Resend, les liens (vérification, réinitialisation) restent lisibles dans
  `/admin/emails`. C'est voulu pour les démonstrations ; ne jamais exploiter la production sans Resend.
- **Actions GitHub** : épinglées par étiquette (`@v4`), pas par empreinte. À épingler par SHA avant
  l'ouverture.
- **À prévoir avant l'ouverture** : un test d'intrusion externe, la double authentification pour les comptes
  admin et la journalisation centralisée des refus d'accès.

## Vérification

- `lib/security.test.ts` (10 tests) : redirections, jetons liés à leur usage, jeton modifié ou expiré, CSV,
  segments de fichiers, présence de `requireAdmin()` dans chaque page admin.
- `lib/services/bloquants.test.ts` : réinitialisation à usage unique.
- `lib/services/emails.test.ts` : signature des webhooks Resend.
- Suite complète : 95 tests unitaires, puis tests de bout en bout sur le build de production.
