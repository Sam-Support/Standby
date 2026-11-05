# E-mails transactionnels (Resend)

Standby envoie ses e-mails par [Resend](https://resend.com) : confirmation d'adresse, mot de passe, missions,
heures, factures, rappels J-7 et J-2, invitation HubSpot, messages du formulaire de contact. Sans
`RESEND_API_KEY`, rien ne part : les e-mails sont simulés et listés dans `/admin/emails`.

## Mise en place sur le nouveau domaine

Dans les exemples, `standby.fr` désigne votre domaine. Remplacez-le partout.

1. **Compte Resend** : créez le compte (au nom de la société), puis activez la double authentification.
2. **Domaine** (Domains → Add domain) :
   - Ajoutez un sous-domaine d'envoi plutôt que le domaine principal, par exemple `notifications.standby.fr`.
     Sa réputation reste ainsi séparée de vos boîtes de messagerie habituelles.
   - **Région : Ireland (eu-west-1)**, la plus proche des destinataires et en Union européenne. Elle ne se
     change plus ensuite : il faudrait supprimer puis recréer le domaine.
3. **DNS** : chez le registraire ou l'hébergeur du domaine, ajoutez les enregistrements que Resend affiche
   dans l'onglet *Records*, **en copiant exactement leurs valeurs** :
   - DKIM : un enregistrement `TXT` (clé publique de signature) ;
   - SPF et adresse de retour : un `MX` et un `TXT` sur le sous-domaine de retour (par défaut `send.…`) ;
   - si vous passez par Cloudflare, laissez les éventuels `CNAME` en « DNS only » (nuage gris).

   Cliquez ensuite sur *Verify* (la propagation prend de quelques minutes à quelques heures).
4. **DMARC**, une fois le domaine vérifié : ajoutez un `TXT` sur `_dmarc.standby.fr` :

   ```
   v=DMARC1; p=none; rua=mailto:dmarc@standby.fr;
   ```

   Gardez `p=none` le temps de vérifier que tous vos envois (Standby, mais aussi votre messagerie
   habituelle) passent DMARC. Passez ensuite à `p=quarantine`, puis à `p=reject`, en gardant `rua`.
5. **Clé d'API** (API Keys → Create) : permission « Sending access », limitée au domaine vérifié.
6. **Webhook** (Webhooks → Add endpoint) :
   - URL : `https://standby.fr/api/resend/webhook` ;
   - événements : `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`,
     `email.complained`, `email.suppressed`, `email.failed` ;
   - copiez le secret de signature (`whsec_…`).
7. **Variables** dans le `.env` du VPS (droits 600), puis redémarrez le conteneur `app` :

   ```
   APP_URL=https://standby.fr
   RESEND_API_KEY=re_…
   EMAIL_FROM=Standby <notifications@notifications.standby.fr>
   EMAIL_REPLY_TO=contact@standby.fr
   SUPPORT_EMAIL=contact@standby.fr
   RESEND_WEBHOOK_SECRET=whsec_…
   ```

   - `EMAIL_FROM` doit appartenir au domaine vérifié à l'étape 2.
   - `EMAIL_REPLY_TO` est l'adresse qui reçoit les réponses des utilisateurs. À défaut, c'est
     `SUPPORT_EMAIL` qui sert.
   - `SUPPORT_EMAIL` reçoit les messages du formulaire de contact : « Répondre » y écrit directement au
     visiteur.
8. **Vérification** : dans `/admin/emails`, le bloc *Configuration* ne doit plus signaler de problème.
   Le bouton « M'envoyer un e-mail de test » écrit à l'adresse de l'administrateur connecté. Le journal
   doit afficher l'e-mail « remis » peu après. Ouvrez-le et vérifiez dans ses en-têtes qu'il passe
   `spf=pass`, `dkim=pass` et `dmarc=pass`.

## Fonctionnement

- **Journal** (`email_outbox`) : chaque envoi y est inscrit, puis son état suit les événements du
  webhook : envoyé, remis, retardé, rebond, signalé indésirable, bloqué, échec.
  - Avec Resend, le lien du bouton n'est pas conservé en base, puisqu'un lien de connexion ou de
    réinitialisation ne doit pas y rester.
  - En mode simulé, il est conservé pour les démonstrations.
- **Idempotence** : l'identifiant de la ligne du journal sert de clé `Idempotency-Key`. Une requête
  répétée ne produit donc pas de doublon.
- **Nouvel essai** : en cas de limite de débit (429) ou de panne passagère (5xx), jusqu'à trois essais.
  Un refus de la requête (domaine non vérifié, adresse invalide) n'est pas réessayé.
  - Un échec ne bloque jamais l'action en cours (réservation, mission…) : il est journalisé.
- **Adresses en échec** : un rebond définitif, une plainte ou un blocage par Resend marque le compte
  concerné.
  - L'adresse apparaît dans `/admin/emails`, et l'utilisateur voit un avertissement dans « Mon compte ».
  - La marque s'efface dès qu'un e-mail lui est de nouveau remis.
  - Les rebonds temporaires (boîte pleine…) sont seulement notés « remise retardée ».
- **Langue** : chaque e-mail part dans la langue du compte du destinataire (`profiles.locale`), avec des
  liens préfixés `/en` ou `/es` (voir le README, section « Langues »).
- **Catégories** : chaque e-mail porte le tag Resend `category` (`compte`, `notification`, `contact`, `crm`,
  `test`) pour filtrer les statistiques dans le tableau de bord Resend.
