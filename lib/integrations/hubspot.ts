import { appUrl } from "./email";

/**
 * HubSpot (OAuth 2.0, application publique). Variables : HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET.
 * Portée minimale : création et lecture de contacts.
 */
export const HUBSPOT_SCOPES = ["crm.objects.contacts.write", "crm.objects.contacts.read"];

export function hubspotEnabled() {
  return Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET);
}

const redirectUri = () => `${appUrl()}/api/crm/hubspot/callback`;

export function hubspotAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    redirect_uri: redirectUri(),
    scope: HUBSPOT_SCOPES.join(" "),
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params}`;
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number; hub_id?: number };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`HubSpot OAuth ${res.status} : ${await res.text()}`);
  return res.json();
}

export function exchangeHubspotCode(code: string) {
  return tokenRequest({ grant_type: "authorization_code", redirect_uri: redirectUri(), code });
}

export function refreshHubspotToken(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/** Crée les contacts par lots de 100. Renvoie le nombre créé. */
export async function createHubspotContacts(accessToken: string, contacts: Record<string, string>[]) {
  let created = 0;
  for (let i = 0; i < contacts.length; i += 100) {
    const batch = contacts.slice(i, i + 100);
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: batch.map((properties) => ({ properties })) }),
    });
    if (!res.ok) throw new Error(`HubSpot contacts ${res.status} : ${(await res.text()).slice(0, 300)}`);
    created += batch.length;
  }
  return created;
}
