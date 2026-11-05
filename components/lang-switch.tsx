"use client";

import { usePathname } from "next/navigation";
import { LANG_NAMES, LANGS, localizePath, splitLang } from "@/lib/i18n/config";
import { useLang } from "./i18n";

const LABEL = "Langue · Language · Idioma";

/**
 * Sélecteur FR / EN / ES : même page dans l'autre langue (le choix est mémorisé par le proxy).
 * Trois boutons sur grand écran ; un menu compact sur téléphone, pour garder l'en-tête sur une ligne.
 */
export function LangSwitch() {
  const lang = useLang();
  const { path } = splitLang(usePathname() || "/");
  const links = LANGS.map((l) => (
    <a
      key={l}
      href={l === "fr" ? `${path}${path.includes("?") ? "&" : "?"}lang=fr` : localizePath(path, l)}
      hrefLang={l}
      lang={l}
      aria-current={l === lang ? "true" : undefined}
      title={LANG_NAMES[l]}
    >
      {l.toUpperCase()}
    </a>
  ));
  return (
    <>
      <div className="langs" role="group" aria-label={LABEL}>
        {links}
      </div>
      <details className="langs-mini">
        {/* nom accessible = texte visible précédé de l'intitulé (le texte affiché doit figurer dans le nom) */}
        <summary>
          <span className="sr-only">{LABEL} : </span>
          {lang.toUpperCase()}
        </summary>
        <div className="langs-menu" role="group" aria-label={LABEL}>
          {links}
        </div>
      </details>
    </>
  );
}
