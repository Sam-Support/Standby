# Plateforme — qualité
- Barrières : tsc, eslint, Vitest (PGlite), next build, Playwright avec axe (WCAG 2.1 AA) sur le build de production.
- Non-régression de sécurité : lib/security.test.ts.
- Manques : envoi réel par Resend (après la configuration DNS), tests de charge.
