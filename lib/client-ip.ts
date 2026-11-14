import { headers } from "next/headers";

/**
 * Adresse IP du visiteur. Sur Vercel, X-Forwarded-For est réécrit par la plateforme avec l'adresse réelle
 * (la valeur envoyée par le client n'est pas conservée) ; X-Real-IP sert de repli.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "inconnue";
}
