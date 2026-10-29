import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { fmt } from "@/lib/format";
import { DEFAULT_LANG, isLang, LANG_HEADER, localizePath, type Lang, type Messages } from "./config";
import { translateFeedback } from "./messages/feedback";

/** Langue de la requête en cours (posée par le proxy) ; français hors requête (tests, tâches planifiées). */
export const getLang = cache(async (): Promise<Lang> => {
  try {
    const v = (await headers()).get(LANG_HEADER);
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
});

/** Formats (montants, dates) dans la langue de la requête. */
export async function getFmt() {
  return fmt(await getLang());
}

/** Messages d'un espace de noms dans la langue de la requête. */
export async function getMessages<T>(m: Messages<T>): Promise<T> {
  return m[await getLang()];
}

/** Erreur ou confirmation écrite en français → langue de la requête (catalogue feedback). */
export async function say(fr: string) {
  return translateFeedback(fr, await getLang());
}

/** Plusieurs messages joints par un séparateur (ex. motifs de retrait du matching « a · b »). */
export async function sayParts(fr: string, sep = " · ") {
  const lang = await getLang();
  return fr
    .split(sep)
    .map((p) => translateFeedback(p, lang))
    .join(sep);
}

/** redirect() vers une adresse interne, préfixée par la langue de la requête. */
export async function localRedirect(path: string): Promise<never> {
  redirect(localizePath(path, await getLang()));
}
