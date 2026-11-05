import { normalizeSiret } from "@/lib/siret";

/**
 * Vérification d'un SIRET, en deux temps :
 * 1. API Sirene officielle de l'INSEE si INSEE_API_KEY est définie ;
 * 2. en secours (pas de clé, INSEE en panne, quota atteint, réponse inattendue) : API publique
 *    « Recherche d'entreprises » (annuaire-entreprises.data.gouv.fr), sans clé.
 * Renvoie null si aucune des deux ne répond : l'inscription n'est pas bloquée, le contrôle sera refait plus tard.
 */

export type SiretResult = { found: boolean; name?: string; active?: boolean; source?: "insee" | "recherche-entreprises" };

const TIMEOUT_MS = 4000;
const inseeBase = () => (process.env.INSEE_SIRENE_URL ?? "https://api.insee.fr/api-sirene/3.11").replace(/\/$/, "");

export async function lookupSiret(siret: string): Promise<SiretResult | null> {
  const v = normalizeSiret(siret);
  if (process.env.INSEE_API_KEY) {
    const insee = await lookupInsee(v, process.env.INSEE_API_KEY);
    if (insee) return insee;
  }
  return lookupRechercheEntreprises(v);
}

type InseeEtablissement = {
  siret?: string;
  uniteLegale?: {
    denominationUniteLegale?: string | null;
    nomUniteLegale?: string | null;
    nomUsageUniteLegale?: string | null;
    prenom1UniteLegale?: string | null;
    etatAdministratifUniteLegale?: string | null;
  };
  periodesEtablissement?: { dateFin?: string | null; etatAdministratifEtablissement?: string | null }[];
};

type InseeResponse = { header?: { statut?: number; message?: string }; etablissement?: InseeEtablissement };

/** Lecture d'une réponse INSEE ; null si elle n'a pas le format attendu. */
export function parseInsee(status: number, body: InseeResponse | null): SiretResult | null {
  if (!body?.header || typeof body.header.statut !== "number") return null;
  if (status === 404 && body.header.statut === 404) return { found: false, source: "insee" };
  if (status !== 200 || !body.etablissement) return null;
  const e = body.etablissement;
  const ul = e.uniteLegale ?? {};
  const current = e.periodesEtablissement?.find((p) => !p.dateFin) ?? e.periodesEtablissement?.[0];
  const person = [ul.prenom1UniteLegale, ul.nomUsageUniteLegale || ul.nomUniteLegale].filter(Boolean).join(" ");
  const name = ul.denominationUniteLegale || person || undefined;
  return {
    found: true,
    name: name && !name.includes("[ND]") ? name : undefined, // diffusion partielle : nom non communiqué
    active: current?.etatAdministratifEtablissement === "A",
    source: "insee",
  };
}

async function lookupInsee(siret: string, key: string): Promise<SiretResult | null> {
  try {
    const res = await fetch(`${inseeBase()}/siret/${siret}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json", "X-INSEE-Api-Key-Integration": key },
    });
    const body = (await res.json().catch(() => null)) as InseeResponse | null;
    const parsed = parseInsee(res.status, body);
    if (!parsed) console.warn(`[sirene] INSEE HTTP ${res.status} : bascule sur Recherche d'entreprises`);
    return parsed;
  } catch (e) {
    console.warn(`[sirene] INSEE injoignable (${e instanceof Error ? e.message : e}) : bascule sur Recherche d'entreprises`);
    return null;
  }
}

type RechercheResponse = {
  results?: { nom_complet?: string; etat_administratif?: string; matching_etablissements?: { siret?: string; etat_administratif?: string }[]; siege?: { siret?: string; etat_administratif?: string } }[];
};

export function parseRechercheEntreprises(siret: string, body: RechercheResponse): SiretResult {
  for (const r of body.results ?? []) {
    const etab = r.siege?.siret === siret ? r.siege : r.matching_etablissements?.find((e) => e.siret === siret);
    if (!etab) continue;
    const state = etab.etat_administratif ?? r.etat_administratif;
    return { found: true, name: r.nom_complet, active: state !== "F" && state !== "C", source: "recherche-entreprises" };
  }
  return { found: false, source: "recherche-entreprises" };
}

async function lookupRechercheEntreprises(siret: string): Promise<SiretResult | null> {
  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return parseRechercheEntreprises(siret, (await res.json()) as RechercheResponse);
  } catch {
    return null;
  }
}
