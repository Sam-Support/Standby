import { createHash } from "node:crypto";

/**
 * Contrôle des mots de passe divulgués, avec le service « Pwned Passwords » de Have I Been Pwned.
 *
 * Le mot de passe ne quitte jamais le serveur : seuls les 5 premiers caractères de son empreinte SHA-1 sont
 * envoyés (principe de k-anonymat du service), qui renvoie toutes les empreintes commençant ainsi ; la
 * comparaison se fait ici. L'en-tête « Add-Padding » masque en plus le nombre de résultats réel.
 *
 * Le service est facultatif : s'il ne répond pas, le mot de passe est accepté (la longueur minimale reste exigée
 * ailleurs). PWNED_PASSWORDS_URL=off désactive le contrôle ; une autre adresse sert aux tests.
 */

const TIMEOUT_MS = 3000;
const base = () => (process.env.PWNED_PASSWORDS_URL ?? "https://api.pwnedpasswords.com").replace(/\/$/, "");

/**
 * Nombre de fois où le mot de passe figure dans des fuites connues (0 = absent), ou null quand le contrôle
 * n'a pas pu se faire (désactivé, service injoignable, réponse inattendue).
 */
export async function pwnedCount(password: string, fetcher: typeof fetch = fetch): Promise<number | null> {
  if (base() === "off") return null;
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetcher(`${base()}/range/${prefix}`, {
      headers: { "Add-Padding": "true", "User-Agent": "stand-by-password-check" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    for (const line of (await res.text()).split(/\r?\n/)) {
      const [hash, count] = line.trim().split(":");
      // les lignes de remplissage (padding) portent un nombre de 0
      if (hash?.toUpperCase() === suffix) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

/** Vrai si le mot de passe est connu des fuites de données ; faux s'il est absent ou si le contrôle est impossible. */
export async function isPwnedPassword(password: string, fetcher?: typeof fetch): Promise<boolean> {
  return ((await pwnedCount(password, fetcher)) ?? 0) > 0;
}
