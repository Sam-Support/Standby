/**
 * Symbole de la marque (logo « Le comptoir ») : bille beurre au-dessus d'un comptoir indigo. Le mot « stand-by »
 * reste du texte en Jost (classe .disp) à côté du symbole, net à toutes les tailles. Fichiers de référence :
 * public/brand/.
 */
export function LogoMark({ dark = false }: { dark?: boolean }) {
  return (
    <svg className="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="18" r="9.5" fill="#ffcd4a" />
      <rect x="5" y="33" width="54" height="23" rx="8" fill={dark ? "#ffffff" : "#4d58ee"} />
    </svg>
  );
}
