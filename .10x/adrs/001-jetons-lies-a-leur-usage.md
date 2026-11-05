# ADR-001 : Jetons signés liés à leur usage

**Statut** : Accepté
**Date** : 2026-10-30
**Feature** : plateforme
**Auteur** : 10x-Team (Security + Architect)

## Contexte
Un seul format de jeton HMAC (`lib/crypto.ts`) servait au cookie de session, aux liens de confirmation et de
changement d'adresse, et aux invitations HubSpot. La session ne vérifiait pas l'usage : un lien reçu par e-mail,
collé dans le cookie, ouvrait une session au nom de l'utilisateur.

## Décision
`signToken(usage, contenu, durée)` signe « usage.corps ». `verifyToken(jeton, usage)` exige l'usage attendu.
Usages : `session`, `verify`, `email-change`, `crm`.

## Alternatives envisagées
| Option | Avantages | Inconvénients | Pourquoi pas |
|---|---|---|---|
| Champ `purpose` dans le contenu, vérifié par chaque appelant | pas de changement de format | facile à oublier, c'est l'erreur constatée | l'API doit imposer la vérification |
| Une clé dérivée par usage (HKDF) | séparation forte | plus de code pour le même résultat | le préfixe d'usage dans le HMAC suffit |
| Sessions en base (identifiant opaque) | révocation immédiate | une table et une requête en plus | à envisager plus tard (déconnexion de tous les appareils) |

## Conséquences
- Positif : un jeton ne peut plus servir à un autre usage, et l'API l'impose à chaque appel.
- Négatif : toutes les sessions sont fermées une fois au déploiement ; les liens d'e-mail encore valables ne
  fonctionnent plus et doivent être redemandés.
- Risque : un nouvel usage non déclaré dans le type `TokenPurpose` est refusé dès la compilation.
