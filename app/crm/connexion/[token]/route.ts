import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/crypto";
import { hubspotAuthorizeUrl, hubspotEnabled } from "@/lib/integrations/hubspot";

/** Lien envoyé à l'administrateur CRM de l'entreprise : démarre l'autorisation HubSpot. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = verifyToken<{ companyId: string; purpose: string }>(token);
  if (!data || data.purpose !== "crm" || !hubspotEnabled()) {
    return new NextResponse("Lien expiré ou invalide. Demandez à l’entreprise de renvoyer l’invitation.", { status: 400 });
  }
  return NextResponse.redirect(hubspotAuthorizeUrl(token));
}
