# Standby Salons : Flux

## 1. Parcours de réservation (exposant)

```mermaid
flowchart TD
  A[Accueil] -->|Staffer ce salon| E1
  A -->|Réserver mon équipe| L{Connecté ?}
  L -- non --> C[Création / connexion compte entreprise]
  C --> E1
  L -- oui --> E1[1 Événement: salon, jours, horaires, stand]
  E1 --> E2[2 Équipe: postes, langues, tenue]
  E2 --> E3[3 Brief: référent, supports, template leads]
  E3 --> M[Matching]
  M --> E4[4 Profils: sélection par poste]
  E4 -->|Re-sélection auto| M
  E4 --> E5[5 Récap et devis]
  E5 -->|CGV acceptées| P[Autorisation de paiement ou mandat SEPA]
  P --> OK[Confirmation SB-xxxx]
  OK --> N[Missions envoyées aux commerciaux]
```

Brouillon enregistré à chaque étape (reprise possible). Estimation HT recalculée côté serveur à chaque changement.

## 2. Cycle de vie d'une réservation

```mermaid
stateDiagram-v2
  [*] --> Brouillon
  Brouillon --> Envoyée: confirmation
  Envoyée --> Partielle: au moins 1 acceptation
  Partielle --> Confirmée: toutes acceptations
  Envoyée --> Confirmée: toutes acceptations
  Partielle --> Remplacement: refus ou expiration
  Confirmée --> Remplacement: désistement (jusqu'à la veille)
  Remplacement --> Partielle
  Confirmée --> EnCours: 1er jour du salon
  EnCours --> HeuresÀValider: fin d'événement
  HeuresÀValider --> Validée: exposant valide (ou auto à J+3)
  Validée --> Payée: débit puis paie lundi
  Brouillon --> Annulée
  Envoyée --> Annulée
  Confirmée --> Annulée: barème d'annulation
```

Statut d'une assignation (commercial) : `proposée → acceptée | refusée | expirée → effectuée → heures_validées → payée`, ou `acceptée → désistée` avant l'événement (remplaçant proposé, au même tarif ou moins en priorité ; motif transmis à l'équipe Standby seulement).

## 3. Chronologie post-réservation (design « Confirmation »)

| Quand | Action | Acteur |
|---|---|---|
| Aujourd'hui | Mission proposée aux commerciaux avec brief et plaquette | Système |
| J-7 | Demande des badges exposants à l'organisateur | Standby (tâche back-office) |
| J-2 | Briefing visio avec le référent | Exposant + équipe |
| Chaque soir | Dépôt des leads au format du template | Commercial |
| Lundi suivant | Validation des heures, paie, facture | Exposant, système |

## 4. Inscription exposant

```mermaid
flowchart LR
  S1[1 Société: SIRET, secteur, taille] --> S2[2 Web: site, LinkedIn, plaquette]
  S2 --> S3[3 Référents]
  S3 --> S4{4 CRM et leads}
  S4 -->|Template Excel| T[Upload template + mapping colonnes]
  S4 -->|CRM| H[HubSpot OAuth ou invitation admin CRM]
  S4 -->|Aucun| F[Fiche standard 12 colonnes]
  T & H & F --> V[Compte créé: vérification email]
```

SIRET contrôlé via API SIRENE à l'étape 1.

## 5. Inscription commercial·e

```mermaid
flowchart LR
  I1[1 Identité, ville] --> I2[2 Profil: postes, spécialités, langues, tarif]
  I2 --> I3[3 Tenue: tailles]
  I3 --> I4[4 Statut et documents: SIRET, URSSAF, ID, RIB]
  I4 --> K[Onboarding Stripe Connect: KYC, IBAN]
  K --> R[Revue admin Retool]
  R -->|ok| P[Profil visible des exposants]
  R -->|refus| X[Pièce à corriger]
```

Le profil n'apparaît dans le matching qu'après validation des documents.

## 6. Dépôt de leads (commercial → exposant)

```mermaid
flowchart TD
  U[Choix de la mission] --> T[Chargement du template de l'exposant]
  T --> X[Upload .xlsx]
  X --> Map[Détection et mapping automatique des colonnes]
  Map --> Rev{Colonnes manquantes ?}
  Rev -- oui --> Warn[Alerte 8 sur 9: complété par Standby]
  Rev -- non --> Prev
  Warn --> Prev[Aperçu 4 premières lignes]
  U --> Ph[Photos de cartes de visite]
  Ph --> OCR[OCR] --> Chk{Confiance suffisante ?}
  Chk -- non --> Hum[Saisie manuelle Retool sous 24 h]
  Chk -- oui --> Prev
  Hum --> Prev
  Prev --> Send[Envoyer à l'entreprise]
  Send --> Out{Format exposant}
  Out -->|Excel| Inbox[Leads dans l'espace entreprise + export]
  Out -->|HubSpot| Hub[Création des contacts HubSpot]
```

## 7. Heures, paiement, paie

```mermaid
sequenceDiagram
  participant C as Commercial
  participant S as Standby
  participant E as Exposant
  participant ST as Stripe
  C->>S: Pointage / heures effectuées
  S->>E: Heures à valider
  E->>S: Valide ou ajuste
  opt Total revu à la baisse
    S->>C: Ajustement à accepter ou contester (48 h)
    C->>S: Accepte, conteste (motif) ou ne répond pas (retenu)
    S->>S: Contestation : arbitrage admin, définitif
  end
  S->>ST: Capture / débit de l'exposant
  S->>ST: Transfert au compte connecté
  ST-->>C: Virement le lundi
  S->>E: Facture dans l'espace
```

Heures par jour : `declare → valide`, ou `declare → ajuste → valide | conteste → valide (arbitrage)`. La facture n'est émise qu'une fois toutes les heures validées.

Avoir : émis par l'admin depuis la fiche réservation (motif, montant TTC ≤ reste à créditer, même taux de TVA que la facture). Facture réglée : remboursement Stripe (`refund.updated` suit l'aboutissement, relance ou « remboursé par virement » en cas d'échec). Non réglée : déduit du prélèvement, réservation soldée à zéro. La paie des commerciaux n'est jamais modifiée par un avoir.

## 7 bis. Compte

- Mot de passe : l'actuel est exigé ; tous les autres appareils sont déconnectés (version de session incrémentée, aussi après une réinitialisation), alerte par e-mail.
- E-mail : mot de passe exigé, lien de confirmation (24 h) envoyé à la nouvelle adresse, alerte sur l'ancienne ; l'ancienne reste l'identifiant jusqu'au clic.

## 8. Plan de navigation (écrans du design → routes)

| Écran | Route Next.js |
|---|---|
| Accueil | `/` |
| Comptes (choix) | `/comptes` |
| Inscription entreprise | `/inscription/entreprise` |
| Inscription commercial | `/inscription/commercial` |
| Réserver 1 à 5 | `/reserver/evenement`, `/equipe`, `/brief`, `/profils`, `/recap` (`?r=<id>`) |
| Confirmation | `/reserver/confirmation/[ref]` |
| Espace entreprise | `/entreprise` |
| Espace commercial | `/commercial`, `/commercial/leads/[missionId]` |
| Contact, FAQ, Plan du site | `/contact`, `/aide`, `/plan-du-site` |
| Légal | `/mentions-legales`, `/cgu`, `/cgv`, `/confidentialite`, `/cookies`, `/accessibilite` |
