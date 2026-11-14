# Paiements (Stripe Connect)

Stand-By encaisse les exposants et paie les commerciaux par **Stripe Connect**. Sans `STRIPE_SECRET_KEY`, rien ne
part : paiements et virements sont simulés (marqués réussis sans appel à Stripe).

## Comment le site utilise Stripe

| Moment | Ce qui se passe chez Stripe | Code |
|---|---|---|
| Un commercial active ses virements (*Mon profil*) | le site crée son **compte connecté Express** (France, particulier, virements le lundi) et l'envoie sur le formulaire Stripe : identité, IBAN | `lib/integrations/stripe.ts`, `createConnectedAccount` |
| Stripe a vérifié le commercial | événement `account.updated` (destination *Connected accounts*) : virements activés, pièce d'identité et RIB validés d'office | webhook, `account.updated` |
| Un exposant confirme une réservation | page Stripe **Checkout en mode « setup »** : il enregistre un mandat SEPA ou une carte, sans être débité | `paymentMethodSession` |
| Moyen de paiement enregistré | événement `checkout.session.completed` | webhook |
| Heures validées | le site **débite** l'exposant (paiement hors session) | `chargeCustomer` |
| Débit réussi ou refusé | `payment_intent.succeeded` / `payment_intent.payment_failed` | webhook |
| Lundi suivant | le site **vire** sa part à chaque commercial (charges et virements séparés, rattachés au paiement) | `transferToFreelancer` |
| Avoir émis par l'admin | **remboursement**, suivi par `refund.updated` / `refund.failed` | `refundPayment` |

La plateforme encaisse donc tout puis reverse : les paiements et remboursements sont des événements de **votre
compte**, seul `account.updated` vient des **comptes connectés**.

---

## 1. Travailler en mode test

Le compte Stripe de la société s'appelle « Stand-By ». Tant que la recette n'est pas finie (tutoriel, étape 9),
**tout se fait en mode test** : bouton *Test mode* en haut du tableau de bord (ou un *sandbox* Stripe). Les
réglages ci-dessous sont à faire **une fois en test, puis une fois en production** : Stripe les sépare.

## 2. Activer Connect

*Connect → Get started* (ou *Settings → Connect*). Selon les libellés affichés, choisissez :

- **Plateforme ou place de marché** : vous mettez en relation des exposants et des commerciaux et vous les payez ;
- comptes connectés **Express** : Stripe héberge l'inscription des commerciaux et leur donne un tableau de bord
  simplifié ;
- **la plateforme encaisse puis transfère** (charges et virements séparés), et prend en charge les frais Stripe
  et les pertes éventuelles (remboursements, litiges) ;
- pays des comptes connectés : **France**.

Puis, dans *Settings → Connect* :

- **Image de marque** (*Branding* / *Onboarding interface*) : nom **Stand-By**, icône `public/brand/stand-by-app-icon-512.png`, couleur
  `#4D58EE`. Stripe l'affiche aux commerciaux pendant leur inscription : sans elle, le formulaire peut refuser de
  s'ouvrir.
- **Coordonnées de la plateforme** : URL du site (`https://stand-by.fr`), adresse e-mail du support
  (`contact@stand-by.fr`).

## 3. Activer les moyens de paiement

*Settings → Payment methods* : activez **Prélèvement SEPA** (*SEPA Direct Debit*) et **Cartes**. Ce sont les
deux seuls que propose la page d'enregistrement du moyen de paiement.

## 4. Mettre la clé dans Vercel

*Developers → API keys* : copiez la **clé secrète de test** (`sk_test_…`).

Dans Vercel, projet **standby-salons** → *Settings → Environment Variables* : `STRIPE_SECRET_KEY`, environnements
**Production et Preview**, case *Sensitive* cochée. La clé de test sert partout jusqu'à la recette. Puis
*Redeploy* (ou demandez-le à Claude) : une variable modifiée n'est prise en compte qu'au déploiement suivant.

**Vérification** : dans `/admin`, la ligne « Paiements Stripe Connect » passe à *configuré*.

## 5. Créer les deux webhooks

Le site a besoin de **deux destinations**, sur la même adresse, chacune avec son secret :

| Destination | *Events from* | Événements | Secret dans Vercel |
|---|---|---|---|
| Paiements | **Your account** | `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `refund.updated`, `refund.failed` | `STRIPE_WEBHOOK_SECRET` |
| Commerciaux | **Connected accounts** | `account.updated` | `STRIPE_CONNECT_WEBHOOK_SECRET` |

Pour chacune : *Workbench → Webhooks → Create an event destination*, *Events from* comme ci-dessus, format
**Snapshot**, version d'API **`endive` la plus récente** proposée (par exemple `2026-10-28.endive` ; le code utilise `2026-09-30.endive`, de la même famille, donc compatible), les événements du tableau, type *Webhook
endpoint*, puis l'adresse. Sur la page de la destination, *Reveal secret* donne le `whsec_…` à coller dans Vercel.

**Quelle adresse ?**

- **Production** (après la fusion de la PR, quand le site est en ligne) : `https://www.stand-by.fr/api/stripe/webhook`
  (ou l'adresse `….vercel.app` de production tant que le domaine n'est pas branché). Secrets dans l'environnement
  **Production**.
- **Aperçu, pour tester avant la mise en production** : les aperçus sont protégés par Vercel, Stripe serait
  refusé. Dans Vercel, *Settings → Deployment Protection → Protection Bypass for Automation*, créez (ou copiez) le
  secret de contournement, puis utilisez :
  `https://standby-salons-git-feat-vercel-sam-supports-projects-ffef07c6.vercel.app/api/stripe/webhook?x-vercel-protection-bypass=<secret>`.
  Ce sont deux destinations de plus, avec leurs propres secrets, à mettre dans l'environnement **Preview**.

Le site ignore de lui-même les événements de l'autre mode (un événement réel avec une clé de test, et
inversement) : Stripe envoie les deux aux destinations *Connected accounts* de production.

**Vérification** (mode test, *Workbench → Shell*) :

- *Paiements* : `stripe trigger payment_intent.succeeded` crée un paiement de test ;
- *Commerciaux* : `stripe accounts update acct_… -d "metadata[test]=webhook"` sur un compte connecté de test.

Puis *Workbench → Webhooks →* la destination *→ Event deliveries* : l'événement doit être *Delivered*, code `200`.
Ces événements ne portent aucune référence Stand-By : le site les accuse réception sans rien modifier.
Une réponse `400` signifie un secret erroné (le corriger dans Vercel, puis *Redeploy*), `404` qu'il manque la clé ou
les secrets, `3xx` une adresse sans `www`. Après correction, *Resend* sur l'événement le renvoie.

## 6. Tester le parcours complet

Sur l'aperçu (ou la production en mode test), avec des comptes de test :

1. **Commercial** : inscription complète, puis *Mon profil → activer mes virements*. Sur le formulaire Stripe
   en mode test, utilisez les valeurs de test :
   - code SMS **`000000`** (ou le bouton « numéro de test » proposé) ;
   - date de naissance **`01/01/1901`** (vérification réussie) ;
   - adresse : ligne 1 **`address_full_match`**, avec une vraie ville et un vrai code postal ;
   - numéro d'identité, s'il est demandé : **`000000000`** ;
   - IBAN de test : **`FR1420041010050500013M02606`** ;
   - pièce d'identité, si demandée : l'image de test « verified » de la documentation Stripe.
   Au retour, quelques secondes plus tard, le profil indique les virements activés (grâce à `account.updated`).
2. **Exposant** : réservation, puis confirmation. Sur la page Stripe :
   - carte **`4242 4242 4242 4242`**, date future, n'importe quel code : réussite ;
   - carte **`4000 0025 0000 3155`** : demande une authentification 3D Secure ;
   - carte **`4000 0000 0000 9995`** : refusée (fonds insuffisants) ;
   - prélèvement SEPA, IBAN **`AT321904300235473204`** : réussit trois minutes après le débit ;
     **`AT861904300235473202`** : échoue.
3. **Après l'événement** : dans `/admin`, « Exécuter les tâches » fait avancer les statuts. Déclarez et validez les
   heures : le débit part, puis le virement au commercial le lundi (ou au prochain passage des tâches planifiées
   s'il est dû).
4. **Avoir** : dans `/admin/reservations`, émettez un avoir sur une facture payée : le remboursement apparaît chez
   Stripe et son état remonte par `refund.updated`.

Chez Stripe, *Payments*, *Connect → Accounts* et *Balance → Transfers* montrent chaque étape ; dans le site,
`/admin/finances`.

## 7. Passer en production

Après la recette :

1. **Activer le compte** Stripe (*Activate payments*) : identité de la société (SIRET), représentant légal, IBAN
   de la société pour les fonds de la plateforme, description de l'activité.
2. Refaire en mode production les étapes 2 et 3 (Connect, image de marque, moyens de paiement).
3. Clé secrète **`sk_live_…`** dans Vercel (`STRIPE_SECRET_KEY`, environnement **Production** seulement ; garder
   la clé de test pour **Preview**).
4. Deux **nouvelles** destinations en mode production vers `https://www.stand-by.fr/api/stripe/webhook` : les secrets du
   mode test ne valent pas en production.
5. *Redeploy* de la production, puis un vrai petit paiement de contrôle, remboursé ensuite par un avoir.
6. Supprimer les comptes et données de test (tutoriel, étape 9).

## À faire valider (avocat ou expert-comptable)

- Les CGU et CGV doivent mentionner Stripe comme prestataire de paiement, et l'acceptation par les commerciaux
  du contrat de compte connecté Stripe (affiché par Stripe pendant leur inscription).
- Le mandat d'autofacturation, la TVA des indemnités d'annulation et la déclaration DAC7 (voir `07-A-FAIRE.md`).
