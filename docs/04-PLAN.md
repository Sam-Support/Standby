# Standby Salons : Plan de réalisation

Hypothèse : 1 développeur + Claude Code, périmètre complet (décision), **14 semaines** réalistes (10–12 si Stripe, HubSpot et OCR passent en phase 2). Chaque jalon se termine par une démo déployée sur le VPS (staging).

| Jalon | Semaines | Contenu | Critère de fin |
|---|---|---|---|
| M0 Fondations | 1 | Repo, Next.js, Supabase (UE), Drizzle, CI GitHub Actions, Docker + Caddy sur le VPS, déploiement staging, Sentry, seed de base | Déploiement staging automatique depuis `main`, `/` s'affiche en HTTPS |
| M1 Design system et pages statiques | 1 à 3 | Tokens Clay, composants (Nav, Stepper, Card, Field, Button, Table…), accueil, 8 pages légales/aide, bandeau cookies, responsive | Pages = design à ±2 px, axe sans erreur bloquante |
| M2 Comptes et onboarding | 3 à 5 | Auth, rôles, RLS, inscriptions exposant (4 étapes) et commercial (4 étapes), uploads, SIRENE, emails Resend | Un exposant et un commercial créent un compte de bout en bout |
| M3 Catalogue et réservation | 5 à 7 | Table `events`, import CSV (Retool), étapes 1 à 3, compteurs, devis serveur, brouillon, panneau « Votre réservation » | Devis du design reproduit au centime |
| M4 Matching et assignation | 7 à 8 | Score, étape 4, favoris, notifications aux commerciaux, acceptation/refus, remplacement, récap + confirmation | Réservation envoyée, acceptations 0/3 → 3/3 |
| M5 Stripe Connect | 8 à 10 | Onboarding KYC, mandat SEPA / acompte, capture après validation, transferts, payout du lundi, factures PDF, webhooks | Cycle complet en mode test, réconciliation OK |
| M6 Leads | 10 à 12 | Upload xlsx, mapping, aperçu, envoi, inbox exposant, export ; HubSpot OAuth ; OCR cartes + repli Retool | Fichier réel mappé et poussé dans HubSpot test |
| M7 Heures, espace admin, finitions | 12 à 15 | Pointage et validation des heures, litiges, `/admin` (tableau de bord, tarification versionnée, salons + logos + import CSV, validation des inscrits, finances, cartes), avis, contact/FAQ, RGPD, perf, accessibilité, tests E2E, bêta fermée | Checklist de lancement validée |

Note : le catalogue de salons et la tarification d'`/admin` sont nécessaires dès M3 ; livrer ces deux écrans à ce moment-là, le reste de l'admin en M7. Durée totale revue à environ 15 semaines.

## Parcours critique et dépendances
- Stripe (M5) conditionne la validité des CGV et de la facturation : démarrer la société, le compte Stripe Connect plateforme et les démarches KYC dès M0.
- Textes légaux (M1) : le design contient des placeholders, rédaction juridique à lancer en parallèle (avocat).
- Offre de commerciaux : recruter une cohorte pilote (≈ 50) avant M7, sinon le matching reste vide.

## Définition de « terminé »
Fonction livrée avec tests (unitaires pour devis/matching, E2E Playwright sur le funnel), RLS testée, accessibilité vérifiée, variables d'environnement documentées, migration appliquée sur staging.

## Prochaines étapes immédiates
1. Valider les hypothèses et points ouverts du PRD (§5 et §9).
2. Choisir le dossier du projet et initialiser le repo (M0).
3. Extraire les tokens et composants Clay du design (M1), puis démarrer l'accueil.
4. Créer les comptes : VPS (nom de domaine, accès SSH par clé), Supabase (région UE), Stripe, Resend, Retool, HubSpot dev.
