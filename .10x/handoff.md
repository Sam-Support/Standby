# Passation

## En cours
**De** : Security et QA (revue du 30 octobre 2026). **Vers** : SDE, puis DevOps.

- Corrections appliquées et testées : `.10x/decisions/security/plateforme.md`, détail dans
  `.10x/reviews/2026-10-30-security-review.md`.
- Repasse graphique et mobile, logos des salons et tutoriel de mise en ligne : faits (30 octobre 2026).
- Équipe : suivre docs/06-MISE-EN-LIGNE.md (comptes, secrets, DNS, textes juridiques, recette).
- DevOps : avant l'ouverture, épingler les actions GitHub par SHA ; renseigner les variables Vercel (Production et
  Preview, docs/06 étape 6) ; superviser `/api/health?db=1`.
- Décisions d'architecture : ADR-001 (jetons liés à leur usage), ADR-002 (contrôle d'accès dans chaque page).

## Historique
- 2026-11-12 : passage de l'hébergement VPS à Vercel + Supabase (ADR-003) ; projets Supabase production et
  staging créés avec leurs buckets ; tutoriel et to-do réécrits.
- 2026-10-30 : découverte du projet, revue de sécurité et de qualité, corrections.
