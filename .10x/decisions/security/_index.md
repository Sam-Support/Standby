# Sécurité — index
- plateforme : revue du 30 octobre 2026, 11 constats corrigés — voir `plateforme.md` et
  `.10x/reviews/2026-10-30-security-review.md`

## Principes
- Autorisation près des données, dans chaque page et chaque action (ADR-002).
- Tout argument lié ou paramètre d'URL vient du navigateur : la propriété est revérifiée dans le service.
- Jetons liés à leur usage (ADR-001) ; secrets aléatoires conservés sous forme d'empreinte.
