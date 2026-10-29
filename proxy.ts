import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isLang, LANG_COOKIE, LANG_HEADER, localizePath, negotiateLang, splitLang, type Lang } from "@/lib/i18n/config";

const PROTECTED = /^\/(entreprise|commercial|admin|notifications|compte)(\/|$)|^\/reserver(\/(?!nouveau)|$)/;
// espace interne, en français uniquement
const FRENCH_ONLY = /^\/admin(\/|$)/;

/**
 * 1. Langues : /en/… et /es/… servent les pages existantes (la langue part dans l'en-tête x-lang) ; une adresse sans
 *    préfixe est en français, sauf si le visiteur a choisi une autre langue (cookie) ou, à sa première visite, si son
 *    navigateur la demande : il est alors redirigé vers /en ou /es. « ?lang=fr » force le retour au français.
 * 2. En-têtes de sécurité, dont une CSP avec nonce par requête (Next l'applique à ses scripts).
 *    Les styles restent en 'unsafe-inline' : le design s'appuie sur des attributs style.
 * 3. Contrôle optimiste : sans cookie de session, les espaces privés renvoient vers la connexion.
 */
export function proxy(req: NextRequest) {
  const { lang: urlLang, path } = splitLang(req.nextUrl.pathname);
  const saved = req.cookies.get(LANG_COOKIE)?.value;
  const forceFr = req.nextUrl.searchParams.get("lang") === "fr";

  if (FRENCH_ONLY.test(path)) {
    // sans préfixe ni mémorisation : la langue choisie pour le reste du site est conservée
    if (urlLang) {
      const url = req.nextUrl.clone();
      url.pathname = path;
      return NextResponse.redirect(url);
    }
    return secure(req, path, DEFAULT_LANG, false);
  }
  if (forceFr && !urlLang) {
    // retour au français choisi dans le sélecteur : mémorisé, puis adresse nettoyée
    const url = req.nextUrl.clone();
    url.searchParams.delete("lang");
    return remember(NextResponse.redirect(url), saved, DEFAULT_LANG);
  }
  if (!urlLang && req.method === "GET") {
    const wanted: Lang = isLang(saved) ? saved : negotiateLang(req.headers.get("accept-language"));
    if (wanted !== DEFAULT_LANG) {
      const url = req.nextUrl.clone();
      url.pathname = localizePath(path, wanted);
      return remember(NextResponse.redirect(url), saved, wanted);
    }
  }
  const lang: Lang = urlLang ?? DEFAULT_LANG;
  return remember(secure(req, path, lang, Boolean(urlLang)), saved, lang);
}

/** Contrôle de session optimiste, en-têtes de sécurité, réécriture des adresses préfixées. */
function secure(req: NextRequest, path: string, lang: Lang, rewrite: boolean): NextResponse {
  if (PROTECTED.test(path) && !req.cookies.has("standby_session")) {
    const url = new URL(localizePath("/connexion", lang), req.url);
    url.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set(LANG_HEADER, lang);
  let res: NextResponse;
  if (rewrite) {
    // /en/entreprise → page /entreprise, l'adresse affichée garde le préfixe
    const url = req.nextUrl.clone();
    url.pathname = path;
    url.searchParams.delete("lang");
    res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    res = NextResponse.next({ request: { headers: requestHeaders } });
  }
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("Content-Language", lang);
  // versions linguistiques de la page pour les moteurs de recherche (hreflang)
  const alternates = (["fr", "en", "es"] as const).map((l) => `<${req.nextUrl.origin}${localizePath(path, l)}>; rel="alternate"; hreflang="${l}"`);
  res.headers.set("Link", [...alternates, `<${req.nextUrl.origin}${path}>; rel="alternate"; hreflang="x-default"`].join(", "));
  return res;
}

/** Mémorise la langue choisie (un an). */
function remember(res: NextResponse, saved: string | undefined, lang: Lang) {
  if (saved !== lang) res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: [
    // les préchargements des pages /en et /es doivent aussi être réécrits
    "/(en|es)",
    "/(en|es)/:path*",
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
