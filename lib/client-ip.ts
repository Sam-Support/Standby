import { headers } from "next/headers";

/**
 * Adresse IP du visiteur. Derrière Caddy, X-Forwarded-For contient l'adresse réelle
 * (Caddy ignore la valeur envoyée par un client non approuvé).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "inconnue";
}
