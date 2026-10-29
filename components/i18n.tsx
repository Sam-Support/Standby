"use client";

import { createContext, useContext } from "react";
import { fmt } from "@/lib/format";
import { DEFAULT_LANG, type Lang, type Messages } from "@/lib/i18n/config";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Langue de la page, transmise aux composants client (posée par le layout racine). */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useMessages<T>(m: Messages<T>): T {
  return m[useLang()];
}

export function useFmt() {
  return fmt(useLang());
}
