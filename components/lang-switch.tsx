"use client";

import { usePathname } from "next/navigation";
import { LANG_NAMES, LANGS, localizePath, splitLang } from "@/lib/i18n/config";
import { useLang } from "./i18n";

/** Sélecteur FR / EN / ES : même page dans l'autre langue (le choix est mémorisé par le proxy). */
export function LangSwitch() {
  const lang = useLang();
  const { path } = splitLang(usePathname() || "/");
  return (
    <div className="langs" role="group" aria-label="Langue · Language · Idioma">
      {LANGS.map((l) => (
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
      ))}
    </div>
  );
}
