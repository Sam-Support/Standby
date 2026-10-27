import { NextResponse, type NextRequest } from "next/server";

/** Contrôle optimiste : sans cookie de session, les espaces privés renvoient vers la connexion. */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("standby_session")) {
    const url = new URL("/connexion", req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/entreprise/:path*", "/commercial/:path*", "/admin/:path*", "/notifications", "/reserver/((?!nouveau).*)", "/reserver"],
};
