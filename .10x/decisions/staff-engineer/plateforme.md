# Plateforme — conventions [DISCOVERED]
- Code, commentaires et messages en français ; textes affichés traduits par lib/i18n/messages (même forme imposée
  par le typage) ; erreurs serveur écrites en français et traduites par le catalogue feedback.ts.
- Actions serveur : `try { … } catch (e) { return fail(e) }`, confirmations par `done()` et `oops()`,
  redirections par `localRedirect()`.
- Autorisation : `require*()` dans chaque page et action (ADR-002) ; propriété des objets vérifiée dans les services.
- Jetons : `signToken` et `verifyToken` avec un usage explicite (ADR-001).
- Montants en centimes, taux en points de base, jours en dates ISO.
