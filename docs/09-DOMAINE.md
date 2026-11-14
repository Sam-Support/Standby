# Brancher stand-by.fr (Nuxit) sur Vercel

Le domaine `stand-by.fr` reste chez **Nuxit** (anciennement PHPNET) : on ne change **pas** les serveurs DNS, on
modifie seulement deux entrées dans la zone DNS Nuxit. La messagerie (`mx.webmo.fr`) et les enregistrements de
Resend (`notification.stand-by.fr`) ne bougent pas.

**Effet** : `https://stand-by.fr` affichera l'application Vercel à la place du site actuellement hébergé chez
Nuxit. Les boîtes e-mail restent chez Nuxit.

Compter 20 minutes d'actions, puis de quelques minutes à quelques heures de propagation DNS.

---

## Zone DNS actuelle (relevée le 14 novembre 2026)

| Nom | Type | Valeur | Après la bascule |
|---|---|---|---|
| `stand-by.fr` | A | `188.130.25.202` et `188.130.25.102` | **remplacées** par l'adresse Vercel |
| `www.stand-by.fr` | A | `188.130.25.202` et `188.130.25.102` | **remplacées** par un `CNAME` Vercel |
| `stand-by.fr` | MX | `mx.webmo.fr` (10 et 100), `mxsecondaire.webmo.fr` (20) | inchangé |
| `_dmarc.stand-by.fr` | TXT | `v=DMARC1; p=none;` | inchangé |
| `resend._domainkey.notification`, `rsend.notification`, `send.notification` | TXT, CNAME | Resend | inchangé |
| `stand-by.fr` | TXT | **absent** : la règle SPF a disparu | **à rétablir** (étape 1) |

Notez les deux adresses `188.130.25.202` et `188.130.25.102` : ce sont elles qu'il faudrait remettre pour revenir
à l'ancien site.

---

## Étape 0 : avant de commencer

- [ ] **La production Vercel est en ligne** : la PR `feat/vercel` est fusionnée dans `main` et le déploiement de
      production est *Ready* (Vercel → *Deployments*). Sinon, le domaine afficherait une erreur Vercel.
- [ ] **L'ancien site** : si vous voulez en garder une trace, faites-en une copie depuis l'espace Nuxit (fichiers et
      base de données) avant la bascule.
- [ ] **Optionnel, pour une bascule rapide** : une heure avant, baissez le TTL des entrées `A` de `stand-by.fr` et de
      `www` à `300` secondes chez Nuxit. Le changement, ou un retour arrière, sera alors visible en 5 minutes au lieu
      d'une heure.

## Étape 1 : rétablir la règle SPF de la messagerie

Elle n'est plus dans la zone (sans doute supprimée avec un ancien enregistrement Resend). Sans elle, les e-mails
envoyés depuis vos boîtes Nuxit (`contact@stand-by.fr`…) risquent de partir en indésirables.

Chez Nuxit, zone DNS de `stand-by.fr`, **ajoutez** :

| Type | Hôte | Données | TTL |
|---|---|---|---|
| TXT | *(vide, ou `@`, selon l'interface)* | `v=spf1 mx include:spf.webmo.fr ~all` | 3600 |

N'ajoutez **pas** Resend à cette règle : Resend envoie depuis `notification.stand-by.fr`, qui a ses propres
enregistrements.

## Étape 2 : ajouter le domaine dans Vercel

1. Vercel → projet **standby-salons** → *Settings* → *Domains* → *Add Domain*.
2. Saisissez **`stand-by.fr`**. Vercel propose d'ajouter aussi `www.stand-by.fr` avec une redirection : acceptez
   l'option **« redirect `www.stand-by.fr` to `stand-by.fr` »** (le site répond sur `stand-by.fr`, `www` y renvoie).
3. Les deux domaines apparaissent avec la mention *Invalid Configuration* : c'est normal, le DNS n'est pas encore
   modifié. Cliquez sur chacun : Vercel affiche **la valeur exacte à mettre chez Nuxit** :
   - pour `stand-by.fr` : un enregistrement **A** et son adresse IP ;
   - pour `www.stand-by.fr` : un enregistrement **CNAME** et sa cible (qui se termine par `vercel-dns…com`).

   Copiez ces deux valeurs : elles sont propres à votre projet, ne reprenez pas celles d'un autre tutoriel.

## Étape 3 : modifier la zone DNS chez Nuxit

Espace client Nuxit → *Domaines* → `stand-by.fr` → *Zone DNS* (la page où vous avez ajouté les entrées Resend).

**Domaine principal `stand-by.fr`** :

1. Supprimez les **deux** entrées `A` dont l'hôte est vide (ou `@`) : `188.130.25.202` et `188.130.25.102`.
2. Ajoutez **une** entrée `A`, hôte vide (ou `@`), données = **l'adresse IP affichée par Vercel**, TTL `3600` (ou
   `300` si vous avez baissé le TTL).
3. S'il existe une entrée `AAAA` pour l'hôte vide, supprimez-la (aujourd'hui il n'y en a pas).

**Sous-domaine `www`** :

4. Supprimez les **deux** entrées `A` dont l'hôte est `www`.
5. Ajoutez une entrée `CNAME`, hôte `www`, données = **la cible affichée par Vercel, avec un point final**
   (par exemple `abcdef.vercel-dns-017.com.`). Sans le point, Nuxit ajouterait `.stand-by.fr` à la fin, comme pour
   l'enregistrement Resend.

**Ne touchez à rien d'autre** : ni aux `MX`, ni au `TXT` SPF, ni à `_dmarc`, ni aux entrées `notification`.

## Étape 4 : vérifier

1. **Vercel** → *Settings → Domains* : au bout de quelques minutes (jusqu'à une heure avec un TTL de 3600),
   `stand-by.fr` et `www.stand-by.fr` passent en *Valid Configuration*, puis le certificat HTTPS est émis
   automatiquement.
2. **Navigateur** : `https://stand-by.fr` affiche l'application ; `https://www.stand-by.fr` renvoie vers
   `https://stand-by.fr` ; `https://stand-by.fr/api/health?db=1` répond `{"ok":true,…,"db":"ok"}`.
3. **Messagerie** : envoyez un e-mail depuis `contact@stand-by.fr` vers une adresse Gmail, puis vers votre boîte :
   il arrive dans les deux sens. Dans Gmail, *Afficher l'original* doit indiquer `SPF : PASS`.
4. **Resend** : `/admin/emails` → « Envoyer un e-mail de test » fonctionne toujours.

Si `www` reste en erreur, vérifiez avec un outil en ligne (par exemple *dnschecker.org*) que le `CNAME` de `www`
pointe bien vers la cible Vercel, sans `.stand-by.fr` ajouté à la fin.

## Étape 5 : ce qui suit la bascule

- **Adresse du site** : dans Vercel → *Environment Variables*, ajoutez `APP_URL` = `https://stand-by.fr`
  (environnement **Production**), puis *Redeploy*. Le site sait déjà déduire son adresse du domaine principal ; la
  variable la fixe noir sur blanc pour les liens des e-mails et les retours Stripe.
- **Webhooks de production** vers le domaine définitif :
  - Stripe, deux destinations sur `https://stand-by.fr/api/stripe/webhook` (voir `08-STRIPE.md`, étape 5),
    secrets dans l'environnement **Production** ;
  - Resend, une destination sur `https://stand-by.fr/api/resend/webhook` (voir `05-EMAILS.md`, étape 6), secret
    `RESEND_WEBHOOK_SECRET` en **Production**.
- **Sous-domaines** : le site envoie l'en-tête HSTS avec `includeSubDomains`. Tout sous-domaine web de
  `stand-by.fr` ouvert dans un navigateur devra donc être en HTTPS (c'est déjà le cas des services courants).
- **Hébergement Nuxit** : si vous résiliez l'hébergement web de l'ancien site, vérifiez avant que l'offre e-mail
  (boîtes `@stand-by.fr`) et le domaine restent actifs : ils sont parfois inclus dans la même formule.

## Revenir en arrière

Chez Nuxit : supprimez l'entrée `A` Vercel et le `CNAME` de `www`, puis remettez pour l'hôte vide **et** pour `www`
les deux entrées `A` `188.130.25.202` et `188.130.25.102`. L'ancien site revient après la durée du TTL.
