# État du projet — Standby Salons

**Phase** : vérification terminée (revue qualité et sécurité du 30 octobre 2026). Reprise du projet par l'équipe
10x : les décisions reconstituées à partir du code sont marquées [DISCOVERED] dans `decisions/`.

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
| PR vers main | à faire : branches `fix/recette` et `feat/i18n` à publier (docs/07-A-FAIRE.md) |

## Barrières
- tsc, eslint : propres
- Vitest : 102 tests au vert
- next build : réussi
- Playwright : 62 tests au vert sur le build de production (dont 5 en 375 px)

## Bloquants
Aucun. Au déploiement, toutes les sessions seront fermées une fois (jetons liés à leur usage, ADR-001).

## À faire
Liste à jour, par ordre et par responsable : [`docs/07-A-FAIRE.md`](../docs/07-A-FAIRE.md).
