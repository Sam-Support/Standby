# ADR-002 : Contrôle d'accès dans chaque page, pas seulement dans le layout

**Statut** : Accepté
**Date** : 2026-10-30
**Feature** : plateforme
**Auteur** : 10x-Team (Security + Staff Engineer)

## Contexte
Avec le rendu partiel de l'App Router, un layout partagé n'est pas réexécuté lors d'une navigation côté client,
et l'en-tête qui décrit l'état du routeur peut être forgé. Le contrôle du rôle admin, placé dans
`app/admin/layout.tsx`, pouvait donc être contourné pour obtenir le rendu d'une page admin.

## Décision
Chaque page et chaque action serveur vérifie elle-même l'utilisateur et son rôle (`requireAdmin`, `requireCompany`,
`requireFreelancer`, `requireUser`), près des données. Le layout garde son contrôle en complément. Un test
(`lib/security.test.ts`) refuse toute page admin sans `await requireAdmin()`.

## Alternatives envisagées
| Option | Avantages | Inconvénients | Pourquoi pas |
|---|---|---|---|
| Contrôle du rôle dans `proxy.ts` | un seul endroit | lecture de la session et de la base dans le proxy ; contrôle optimiste seulement | ne remplace pas une vérification près des données |
| Couche d'accès aux données qui vérifie le rôle | défense en profondeur maximale | refonte des services | disproportionné aujourd'hui ; à reconsidérer si l'équipe grandit |

## Conséquences
- Positif : l'autorisation ne dépend plus de la manière dont la page est atteinte.
- Négatif : une ligne de plus par page, tenue à jour grâce au test.
