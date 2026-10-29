// Langues de la plateforme : le français reste sans préfixe, l'anglais et l'espagnol sous /en et /es.

export const LANGS = ["fr", "en", "es"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "fr";
export const LANG_COOKIE = "standby_lang";
export const LANG_HEADER = "x-lang";

/** Locales Intl (dates, montants) */
export const LOCALES: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES" };
export const LANG_NAMES: Record<Lang, string> = { fr: "Français", en: "English", es: "Español" };

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

const PREFIXED = /^\/(en|es)(?=\/|$|\?|#)/;

/** « /en/entreprise » → { lang: "en", path: "/entreprise" } ; sans préfixe → lang null */
export function splitLang(pathname: string): { lang: Lang | null; path: string } {
  const m = pathname.match(PREFIXED);
  if (!m) return { lang: null, path: pathname };
  return { lang: m[1] as Lang, path: pathname.slice(m[0].length) || "/" };
}

/** Lien interne dans la langue voulue (« /entreprise » → « /en/entreprise »). */
export function localizePath(href: string, lang: Lang): string {
  if (!href.startsWith("/") || href.startsWith("//") || /^\/(api|_next)(\/|$)/.test(href)) return href;
  const { path } = splitLang(href);
  if (lang === DEFAULT_LANG) return path;
  // accueil : « /en », « /en?x=1 » (pas de barre finale, que Next redirigerait)
  const rest = path === "/" ? "" : /^\/[?#]/.test(path) ? path.slice(1) : path;
  return `/${lang}${rest}`;
}

/** Langue préférée d'après l'en-tête Accept-Language (français par défaut). */
export function negotiateLang(acceptLanguage: string | null): Lang {
  if (!acceptLanguage) return DEFAULT_LANG;
  const prefs = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.slice(0, 2).toLowerCase(), q: q === undefined ? 1 : Number(q) || 0 };
    })
    .sort((a, b) => b.q - a.q);
  return prefs.find((p) => isLang(p.lang))?.lang as Lang | undefined ?? DEFAULT_LANG;
}

/** Messages d'un espace de noms dans les trois langues (l'anglais et l'espagnol doivent avoir la forme du français). */
export function defineMessages<T extends object>(m: { fr: T; en: NoInfer<T>; es: NoInfer<T> }) {
  return m;
}
export type Messages<T> = { fr: T; en: T; es: T };
