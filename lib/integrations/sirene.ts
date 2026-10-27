import { normalizeSiret } from "@/lib/siret";

/**
 * Vérification d'un SIRET via l'API publique « Recherche d'entreprises » (annuaire-entreprises.data.gouv.fr).
 * Renvoie null si l'API est injoignable : l'inscription n'est pas bloquée, la vérification reste à faire en admin.
 */
export async function lookupSiret(siret: string): Promise<{ found: boolean; name?: string; active?: boolean } | null> {
  const v = normalizeSiret(siret);
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${v}&page=1&per_page=1`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: { nom_complet?: string; etat_administratif?: string; matching_etablissements?: { siret?: string }[]; siege?: { siret?: string } }[];
    };
    const hit = json.results?.find((r) => r.siege?.siret === v || r.matching_etablissements?.some((e) => e.siret === v));
    if (!hit) return { found: false };
    return { found: true, name: hit.nom_complet, active: hit.etat_administratif !== "C" };
  } catch {
    return null;
  }
}
