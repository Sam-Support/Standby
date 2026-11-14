# À faire — état au 14 novembre 2026

Le produit est terminé côté code : réservation, espaces entreprise et commercial, administration, facturation
et autofacturation, trois langues, e-mails Resend, version mobile revue, logos contrôlés. Les corrections de la
revue de sécurité sont faites. Tout est testé : 104 tests unitaires, 62 tests de bout en bout sur le build de
production, dont 5 sur téléphone. L'hébergement est passé du VPS à **Vercel + Supabase** (ADR-003).

**Le site est en ligne sur https://www.stand-by.fr** (`stand-by.fr` y renvoie), avec Stripe en mode test : on
peut tout essayer, aucun vrai paiement ne passe encore.

Ce qui reste est surtout humain. Le détail pas à pas est dans [`06-MISE-EN-LIGNE.md`](06-MISE-EN-LIGNE.md) :
cette liste dit **quoi**, **dans quel ordre** et **qui**.

Légende : 🧑 vous · ⚖️ avocat ou expert-comptable · 🤖 Claude peut le faire sur demande.

---

## 1. Le code dans `main`

- [x] 5 novembre : PR #7 fusionnée (tout l'historique), PR #1 à #6 fermées.
- [x] 14 novembre : PR #8 (passage sur Vercel) fusionnée. **Désormais, chaque fusion dans `main` met en
      production.**

## 2. Mettre en ligne (tutoriel, étapes 2 à 7)

Déjà fait par 🤖 : les deux projets Supabase (production et `standby-staging`, Francfort) avec leurs buckets
`private` et `public` ; le projet Vercel `standby-salons` relié au dépôt, avec `SUPABASE_URL`, `SUPABASE_ANON_KEY`
et les secrets `AUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET` (générés, un jeu par environnement).

| | Tâche | Qui | Durée indicative |
|---|---|---|---|
| [x] | Vercel : domaine branché, `www.stand-by.fr` principal, `stand-by.fr` y renvoie, HTTPS actif ; SPF de la messagerie remis chez Nuxit ([`09-DOMAINE.md`](09-DOMAINE.md)) | 🧑 | fait le 14 novembre |
| [x] | Supabase : mot de passe de chaque base, chaînes *Transaction pooler* et *Session pooler*, clé secrète ; collés dans Vercel | 🧑 | fait |
| [x] | Resend : domaine d'envoi `notification.stand-by.fr` (Irlande), DKIM, SPF, DMARC, clé, webhooks staging et production (200) ([`05-EMAILS.md`](05-EMAILS.md)) | 🧑 | fait |
| [x] | Stripe Connect **en mode test** : clé, deux destinations webhook en staging et en production (200), SEPA et cartes ([`08-STRIPE.md`](08-STRIPE.md)) | 🧑 | fait |
| [ ] | Facultatif : clé INSEE (SIRENE), application HubSpot, clé Anthropic (cartes de visite) | 🧑 | 15 min chacun |
| [x] | Vercel : variables posées (dont `APP_URL`), production redéployée ; `/api/health?db=1` répond, le Schedule tourne | 🤖 | fait |
| [x] | Premier administrateur après le premier déploiement : inscription (étape 1) avec votre mot de passe, puis promotion dans Supabase (tutoriel, étape 7 ; 🤖 peut faire la promotion) ; contrôles de `/admin` et de `/admin/emails` | 🧑 | 15 min |

## 3. Contenu, juridique, métier

- [ ] ⚖️ Compléter les passages `[…]` des textes juridiques : éditeur, hébergeur, délais et pénalités, barème
      d'annulation, durées de conservation, DPO. Fichiers : `lib/content/legal.ts`, puis les versions
      `legal-en.ts` et `legal-es.ts`. 🤖 peut reporter les textes validés et faire les traductions.
- [ ] 🧑 Coordonnées du support : `app/contact/page.tsx`. Identité de l'éditeur sur les factures, avoirs et
      autofactures (voir le tableau de l'étape 8 du tutoriel). 🤖 peut le faire si vous donnez les informations.
- [ ] ⚖️ Statut des commerciaux indépendants (risque de requalification).
- [ ] ⚖️ Mandat d'autofacturation, mentions des autofactures, TVA des indemnités d'annulation.
- [ ] ⚖️ DAC7 : obligations de déclaration de la plateforme (voir aussi le point 6).
- [ ] 🧑 Tarification dans `/admin/tarification` : frais de service, commission, tarifs plancher, barème
      d'annulation.
- [ ] 🧑 Calendrier réel des salons : import CSV dans `/admin/salons`, dates vérifiées, logos uniquement avec
      l'accord écrit de l'organisateur.

## 4. Recette, puis ouverture

- [ ] 🧑 Recette complète sur le vrai domaine, sur téléphone et sur ordinateur, en français, en anglais et en
      espagnol (liste à cocher : étape 9 du tutoriel).
- [ ] 🧑 Vérifier dans les en-têtes d'un e-mail reçu `spf=pass`, `dkim=pass` et `dmarc=pass`.
- [ ] 🧑 Passer Stripe en réel ([`08-STRIPE.md`](08-STRIPE.md), étape 7) : activation du compte, réglages Connect
      en live (dont le support Accounts v1, ou migration vers Accounts v2 🤖), clé `sk_live_…` et deux nouvelles
      destinations webhook en Production, puis *Redeploy*.
- [ ] 🧑 Supprimer les comptes et données de test.

## 5. Sécurité et exploitation avant l'ouverture

- [ ] 🧑 Double authentification sur GitHub, le registraire, Vercel, Supabase, Stripe et Resend.
- [ ] 🤖 Épingler les GitHub Actions par empreinte (SHA) au lieu de `@v4`.
- [ ] 🧑 Protéger la branche `main` sur GitHub : CI verte obligatoire avant fusion (la fusion met en production).
- [ ] 🧑 Supervision externe de `https://www.stand-by.fr/api/health?db=1`, avec alerte après deux échecs.
- [ ] 🧑 (🤖 pour l'intégration) Suivi des erreurs : Sentry ou équivalent, via la place de marché Vercel.
- [ ] ⚖️ Mentions légales : Vercel Inc. est une société américaine (fonctions exécutées à Francfort) ; faire
      valider la formulation du transfert de données et le DPA Vercel.
- [ ] 🧑 Test de restauration d'une sauvegarde Supabase.
- [ ] 🧑 Test d'intrusion par un prestataire, avant d'accueillir de vraies pièces d'identité.
- [ ] 🧑 DMARC : passer à `p=quarantine` au bout de 2 à 4 semaines sans échec, puis à `p=reject`.

## 6. Évolutions possibles (après l'ouverture)

Points relevés pendant les revues, non bloquants pour ouvrir, tous 🤖 :

- Double authentification pour les comptes administrateur.
- Sessions révocables côté serveur (« déconnecter tous les appareils » sans changer de mot de passe).
- DAC7 : collecter la date de naissance et le numéro fiscal des commerciaux, et compléter l'export.
- Alerte si les tâches planifiées ne tournent plus depuis une heure.
- Dépendance `uuid` signalée par `npm audit` via `exceljs` : non exploitable ici, à mettre à jour dès
  qu'exceljs publie une version corrigée.
- Autres CRM que HubSpot : Salesforce, Pipedrive.
- Outil de mesure d'audience, si besoin : le bandeau de consentement est prêt.
- Tests de charge avant une montée en volume.

---

Références : [`06-MISE-EN-LIGNE.md`](06-MISE-EN-LIGNE.md) (pas à pas), [`05-EMAILS.md`](05-EMAILS.md)
(e-mails), [`../.10x/reviews/`](../.10x/reviews/) (revues de sécurité et de qualité), [`../README.md`](../README.md)
(fonctionnement).
