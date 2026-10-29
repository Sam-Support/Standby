import { NextResponse, type NextRequest } from "next/server";
import { getLang } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentCompany } from "@/lib/auth/session";
import { signToken } from "@/lib/crypto";
import { hubspotAuthorizeUrl, hubspotEnabled } from "@/lib/integrations/hubspot";

export async function GET(req: NextRequest) {
  const company = await getCurrentCompany();
  if (!company) return NextResponse.redirect(new URL(localizePath("/connexion?next=/entreprise", await getLang()), req.url));
  if (!hubspotEnabled()) return NextResponse.redirect(new URL(localizePath("/entreprise?crm=erreur", await getLang()), req.url));
  return NextResponse.redirect(hubspotAuthorizeUrl(signToken({ companyId: company.id, purpose: "crm" }, 3600)));
}
