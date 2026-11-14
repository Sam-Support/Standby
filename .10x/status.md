# État du projet — Standby Salons

**Phase** : livraison. Code fusionné dans `main` le 5 novembre 2026 ; passage de l'hébergement sur Vercel +
Supabase le 12 novembre (ADR-003), en attente de fusion. Les décisions reconstituées à partir du code sont
marquées [DISCOVERED] dans `decisions/`.

| Chantier | État |
|---|---|
| Versions anglaise et espagnole | fait (`ea1a8b3`) |
| Intégration Resend (journal, webhook, e-mail de test, guide DNS) | fait (`0e5b13f`) |
| Revue de sécurité : 11 constats (1 élevé, 5 moyens, 5 faibles) | corrigés (`0e5b13f`) |
| Index des clés étrangères (migration 0009) | fait |
| Configuration de Resend sur le domaine | à faire par l'équipe (docs/05-EMAILS.md) |
| Repasse graphique et mobile (accueil sans carrousel, en-tête compact, tableaux de bord) | fait (`b5d478b`) |
| Logos des salons : dimensions contrôlées, sinon nom sur fond de couleur (migration 0010) | fait |
| Tutoriel de mise en ligne (docs/06-MISE-EN-LIGNE.md) | fait |
| PR vers main | fait le 5 novembre : PR #7 fusionnée, PR #1 à #6 fermées |
| Hébergement Vercel + Supabase : `vercel.json`, migrations à la construction, Schedule, projets Supabase production et staging avec buckets (ADR-003) | fait (branche `feat/vercel`, PR à fusionner) ; variables secrètes à poser dans Vercel par l'équipe |

## Barrières
- tsc, eslint : propres
- Vitest : 104 tests au vert
- next build : réussi
- Playwright : 62 tests au vert sur le build de production (dont 5 en 375 px)

## Bloquants
Aucun. Au déploiement, toutes les sessions seront fermées une fois (jetons liés à leur usage, ADR-001).

## À faire
Liste à jour, par ordre et par responsable : [`docs/07-A-FAIRE.md`](../docs/07-A-FAIRE.md).
