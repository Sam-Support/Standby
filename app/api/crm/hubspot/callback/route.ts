import { NextResponse, type NextRequest } from "next/server";
import { getDb, schema as s } from "@/db";
import { getCurrentCompany } from "@/lib/auth/session";
import { encrypt, verifyToken } from "@/lib/crypto";
import { exchangeHubspotCode } from "@/lib/integrations/hubspot";
import { audit } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = verifyToken<{ companyId: string; purpose: string }>(req.nextUrl.searchParams.get("state") ?? undefined);
  const viewer = await getCurrentCompany();
  const back = (ok: boolean) =>
    viewer
      ? NextResponse.redirect(new URL(`/entreprise?crm=${ok ? "ok" : "erreur"}`, req.url))
      : new NextResponse(ok ? "HubSpot est connecté à standby. Vous pouvez fermer cette page." : "La connexion HubSpot a échoué.", {
          status: ok ? 200 : 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
  if (!code || !state || state.purpose !== "crm") return back(false);
  try {
    const t = await exchangeHubspotCode(code);
    const db = await getDb();
    const values = {
      status: "connecte",
      accessTokenEnc: encrypt(t.access_token),
      refreshTokenEnc: encrypt(t.refresh_token),
      expiresAt: new Date(Date.now() + t.expires_in * 1000),
      externalAccountId: t.hub_id ? String(t.hub_id) : null,
    };
    await db
      .insert(s.crmConnections)
      .values({ companyId: state.companyId, provider: "HubSpot", ...values })
      .onConflictDoUpdate({ target: s.crmConnections.companyId, set: values });
    await audit(db, null, "crm.connected", "company", state.companyId);
    return back(true);
  } catch (e) {
    console.error(e);
    return back(false);
  }
}
