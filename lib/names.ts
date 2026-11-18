/**
 * Noms des commerciaux montrés aux entreprises.
 *
 * Tant que l'équipe Stand-By n'a pas autorisé le contact pour une réservation (contrat signé, paiement reçu),
 * l'entreprise ne voit que le prénom et l'initiale du nom, sans téléphone ni e-mail : elle ne peut pas joindre
 * le commercial en direct pour contourner la plateforme.
 */

/** « Camille », « Dupont » → « Camille D. » */
export function shortName(first: string, last: string): string {
  const initial = Array.from(last.trim())[0];
  return initial ? `${first.trim()} ${initial.toUpperCase()}.` : first.trim();
}

/** Initiale du nom suivie d'un point (« D. »), ou chaîne vide. */
export function lastInitial(last: string): string {
  const initial = Array.from(last.trim())[0];
  return initial ? `${initial.toUpperCase()}.` : "";
}

/** Nom complet si le contact est autorisé, sinon prénom et initiale. */
export function nameFor(first: string, last: string, authorized: boolean): string {
  return authorized ? `${first} ${last}`.trim() : shortName(first, last);
}
