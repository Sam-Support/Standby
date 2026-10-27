# Standby Salons : PRD

Source : design « Standby Salons » (21 écrans, artifact claude.ai). Version 0.1, 27 oct. 2026.

## 1. Vision

Marketplace française qui met en relation des **entreprises exposantes** et des **commerciaux indépendants** (commerciaux de stand, hôtes·ses, animateurs, interprètes, chefs de stand, démonstrateurs) pour staffer des **salons professionnels et foires**.

Promesse : « Votre stand, staffé avant l'ouverture des portes. » Équipe composée en ~3 minutes, contrats/badges/leads/paie gérés par la plateforme.

## 2. Utilisateurs

| Rôle | Objectif | Écrans design |
|---|---|---|
| Exposant (entreprise) | Réserver une équipe, suivre les acceptations, valider les heures, recevoir les leads dans son format CRM | Evenement → Equipe → Brief → Profils → Recap → Confirmation, Entreprise |
| Commercial·e (freelance, auto-entrepreneur) | Trouver des missions, accepter, déposer les leads, être payé·e chaque lundi | Commercial, InscriptionCommercial |
| Admin Standby (interne) | Vérifier les profils, tenir le calendrier des salons, gérer litiges d'heures, saisir les cartes de visite | Hors design (back-office, voir §6) |
| Visiteur | Comprendre l'offre, s'inscrire | Main, Comptes, pages légales/aide |

## 3. Périmètre (décision : tout le design, bout en bout)

### 3.1 Site public
- Accueil : hero, indicateurs, carrousel « Prochains événements » (dates vérifiées), 3 étapes, CTA exposant/commercial.
- Pages : Mentions légales, CGU, CGV, Confidentialité, Cookies (bandeau + gestion), Accessibilité (RGAA, « partiellement conforme »), Contact, FAQ / Centre d'aide, Plan du site.

### 3.2 Comptes
- **Exposant** (4 étapes) : société, SIRET, secteur, taille ; site, LinkedIn, plaquette PDF ; référents (nom, fonction, téléphone) ; format des leads : template Excel / accès CRM (HubSpot, email admin CRM) / fiche standard Standby (12 colonnes).
- **Commercial·e** (4 étapes) : identité et ville ; postes (le 1er = principal), spécialités sectorielles, langues, tarif horaire ; tailles de tenue (haut, pantalon, pointure) ; statut auto-entrepreneur, SIRET, attestation URSSAF, pièce d'identité, RIB.
- Connexion, déconnexion, rôles exposant / commercial / admin.

### 3.3 Parcours de réservation (exposant)
1. **Événement** : onglets salons pro / foires, recherche (nom, ville, secteur), choix des jours (montage la veille possible), début/fin de service (défaut 9 h–18 h, 8 h facturées/jour, pause déduite), n° de stand.
2. **Équipe** : quantités par poste (compteurs −/+), « équipe type » suggérée (ex. 2 commerciaux + 1 accueil), postes rares repliés, langues (FR, EN, ES, DE, IT, ZH, AR, autre), tenue (prêtée par l'exposant / perso noir & blanc / tenue Standby +3 €/h).
3. **Brief** : référent sur place, supports (plaquette du compte + version spécifique PDF/PPT 20 Mo), produits à mettre en avant, brief libre, template de remontée des leads, fréquence (chaque soir / fin d'événement).
4. **Profils** : matching, score de compatibilité, sélection par poste, favoris ♥, « re-sélection auto ».
5. **Récap et devis** : récapitulatif, devis détaillé (lignes, frais de service 12 %, HT, TVA 20 %, TTC), acceptation des conditions, confirmation.
- Panneau latéral « Votre réservation » avec estimation HT en direct à chaque étape.
- **Confirmation** : référence `SB-xxxx-xxxx`, acceptations 0/N, frise J-7 badges, J-2 briefing visio, chaque soir leads, lundi suivant validation des heures + paie + facture.

### 3.4 Espace exposant
- KPI : réservations à venir, heures à valider, leads reçus.
- Liste des réservations (statuts : acceptations n/N, confirmée, heures à valider, leads attendus / pendant l'événement), montant.
- Leads reçus (dans l'ordre des colonnes du template).
- Validation des heures par personne (ajustable), paie le lundi suivant.
- Profil entreprise (modifiable), référents, commerciaux favoris.

### 3.5 Espace commercial
- Profil, note, tailles, revenus de la semaine (graphique), prochain virement.
- Missions proposées : acceptation / refus.
- **Dépôt de leads** : upload Excel avec détection et mapping des colonnes vers le template de l'exposant (ex. « 8/9 colonnes reconnues », « Entreprise → Société »), aperçu des premières lignes, colonnes manquantes complétées par Standby ; photos de cartes de visite (transcrites sous 24 h) ; envoi à l'entreprise.

### 3.6 Paiement et paie
- Devis → débit de l'exposant après validation des heures, facture dans l'espace.
- Virement hebdomadaire (lundi) aux commerciaux.
- Frais de service 12 % (sur le devis exposant), tarifs « dès X €/h » par poste (27 / 19 / 34 / 36 / 23 / 25).

### 3.7 Intégrations
Stripe Connect (paiement, KYC, virements), HubSpot (OAuth, création de contacts), Excel (xlsx), OCR cartes de visite, Resend (emails), API SIRENE (SIRET).

## 4. Hors périmètre v1
Application mobile native, chat temps réel, appels d'offres multi-devis, CRM autres que HubSpot (Salesforce, Pipedrive), international hors France (le design cite « International » : prévoir, ne pas livrer), paie salariée.

## 5. Règles métier à figer

| Règle | Valeur du design | À valider |
|---|---|---|
| Heures facturées/jour | 8 h pour 9 h–18 h (pause déduite) | Règle pour d'autres amplitudes |
| Frais de service | 12 % du sous-total HT | Qui le supporte, commission côté freelance ? |
| TVA | 20 % | Freelance en franchise de TVA ? |
| Tarif | Taux horaire propre à chaque commercial, « dès X €/h » | Planchers/plafonds par poste |
| Acceptation | Chaque commercial accepte sa mission | Délai d'expiration, remplacement auto |
| Débit exposant | Après validation des heures | Voir risque paiement §7 |
| Paie | Lundi suivant la validation | Délai légal et seuils |
| Leads | Remise dans le template, complétée par Standby | SLA 24 h pour les cartes |
| Annulation | Non montrée | Barème exposant et commercial |

## 6. Back-office admin (hors design, indispensable)
Décision (révisée) : **espace `/admin` intégré à l'application**, réservé au rôle `admin`, même design Clay, journal d'audit sur chaque action. Retool éventuel en lecture seule pour l'analyse ponctuelle ; pas d'Airtable (second référentiel, RGPD).

| Écran admin | Contenu |
|---|---|
| Tableau de bord | Réservations par statut, CA, commissions perçues, heures à valider, inscriptions en attente, alertes de paiement |
| Tarification | Frais de service exposant (12 %), commission côté commercial, majoration tenue Standby (+3 €/h), planchers/plafonds par poste, TVA ; date d'effet et historique |
| Salons et foires | Création/édition, import CSV, **logo** (téléversement, facultatif, repli pastille + initiales), date de dernière vérification |
| Validation des inscrits | File des documents (identité, URSSAF, SIRET, RIB) |
| Litiges | Contestations d'heures, annulations, remplacements |
| Finances | Paiements, virements du lundi, factures, réconciliation Stripe |
| Cartes de visite | File de transcription sous 24 h |

Logos de salons : marques tierces, obtenir l'accord des organisateurs et valider avec l'avocat.

## 7. Risques majeurs
1. **Requalification en salariat / prêt de main-d'œuvre** : tenue imposée, briefing, horaires, référent sur place, tarif encadré. Avis d'un avocat droit social avant le lancement ; CGU/CGV et clause de subordination à relire.
2. **Autorisation de carte expirant en ~7 jours** alors que le débit se fait après l'événement (semaines plus tard) : prévoir mandat SEPA, acompte à la réservation ou séquestre Stripe.
3. **Facturation pour compte de tiers** : mandat de facturation des freelances, TVA, obligations de plateforme (déclaration DAC7, loyauté).
4. **Données personnelles** : leads = données de tiers (responsable de traitement exposant, Standby sous-traitant) ; pièces d'identité/RIB sensibles ; registre RGPD, DPA, durée de conservation.
5. **Accessibilité** : RGAA ; le design annonce « partiellement conforme », plan de mise en conformité à écrire.
6. **Effet de levier du matching** : sans offre de commerciaux dense, la promesse (« 117 profils dispo ») est creuse ; seed manuel de l'offre.

## 8. Indicateurs de succès (v1)
Taux de complétion du funnel de réservation, délai moyen d'acceptation, taux de remplissage des équipes à J-2, % de leads conformes au premier dépôt, délai de validation des heures, NPS exposant, taux d'impayés.

## 9. Questions ouvertes
Nom légal de l'éditeur et mentions réelles (textes légaux du design = placeholders), grille tarifaire définitive, politique d'annulation, processus de remplacement d'un commercial défaillant, modération des avis, langue (FR seul en v1).
