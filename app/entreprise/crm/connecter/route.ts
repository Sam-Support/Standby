import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCompany } from "@/lib/auth/session";
import { signToken } from "@/lib/crypto";
import { hubspotAuthorizeUrl, hubspotEnabled } from "@/lib/integrations/hubspot";

export async function GET(req: NextRequest) {
  const company = await getCurrentCompany();
  if (!company) return NextResponse.redirect(new URL("/connexion?next=/entreprise", req.url));
  if (!hubspotEnabled()) return NextResponse.redirect(new URL("/entreprise?crm=erreur", req.url));
  return NextResponse.redirect(hubspotAuthorizeUrl(signToken({ companyId: company.id, purpose: "crm" }, 3600)));
}
