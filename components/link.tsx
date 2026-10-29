"use client";

import NextLink from "next/link";
import { localizePath } from "@/lib/i18n/config";
import { useLang } from "./i18n";

/** Lien interne qui garde la langue de la page (/en, /es). */
export default function Link(props: React.ComponentProps<typeof NextLink>) {
  const lang = useLang();
  const href = typeof props.href === "string" ? localizePath(props.href, lang) : props.href;
  return <NextLink {...props} href={href} />;
}
