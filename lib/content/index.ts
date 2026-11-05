import type { Lang } from "@/lib/i18n/config";
import * as fr from "./legal";
import * as en from "./legal-en";
import * as es from "./legal-es";

const CONTENT: Record<Lang, typeof fr> = { fr, en, es };

/** Textes légaux et FAQ dans une langue (les traductions sont informatives : seule la version française fait foi). */
export function legalContent(lang: Lang) {
  return CONTENT[lang];
}
