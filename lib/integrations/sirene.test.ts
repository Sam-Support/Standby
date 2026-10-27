import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupSiret, parseInsee, parseRechercheEntreprises } from "./sirene";

const SIRET = "42462288400015";
const inseeOk = {
  header: { statut: 200, message: "ok" },
  etablissement: {
    siret: SIRET,
    uniteLegale: { denominationUniteLegale: "MICHELIN", etatAdministratifUniteLegale: "A" },
    periodesEtablissement: [{ dateFin: null, etatAdministratifEtablissement: "A" }],
  },
};
const recherche = { results: [{ nom_complet: "MICHELIN", etat_administratif: "A", siege: { siret: SIRET, etat_administratif: "A" } }] };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("lecture des réponses", () => {
  it("INSEE : actif, fermé, entrepreneur individuel, introuvable, format inattendu", () => {
    expect(parseInsee(200, inseeOk)).toEqual({ found: true, name: "MICHELIN", active: true, source: "insee" });
    const ferme = { ...inseeOk, etablissement: { ...inseeOk.etablissement, periodesEtablissement: [{ dateFin: null, etatAdministratifEtablissement: "F" }] } };
    expect(parseInsee(200, ferme)?.active).toBe(false);
    const ei = { ...inseeOk, etablissement: { ...inseeOk.etablissement, uniteLegale: { prenom1UniteLegale: "KARIM", nomUniteLegale: "BENALI" } } };
    expect(parseInsee(200, ei)?.name).toBe("KARIM BENALI");
    expect(parseInsee(404, { header: { statut: 404, message: "Aucun élément trouvé" } })).toEqual({ found: false, source: "insee" });
    expect(parseInsee(404, { message: "Not Found" } as never)).toBeNull();
    expect(parseInsee(429, { header: { statut: 429 } })).toBeNull();
  });

  it("Recherche d'entreprises : siège, établissement secondaire, introuvable", () => {
    expect(parseRechercheEntreprises(SIRET, recherche)).toEqual({ found: true, name: "MICHELIN", active: true, source: "recherche-entreprises" });
    const secondaire = { results: [{ nom_complet: "X", siege: { siret: "1" }, matching_etablissements: [{ siret: SIRET, etat_administratif: "F" }] }] };
    expect(parseRechercheEntreprises(SIRET, secondaire).active).toBe(false);
    expect(parseRechercheEntreprises(SIRET, { results: [] }).found).toBe(false);
  });
});

describe("INSEE d'abord, Recherche d'entreprises en secours", () => {
  it("utilise l'INSEE quand la clé est définie et qu'elle répond", async () => {
    vi.stubEnv("INSEE_API_KEY", "cle-de-test");
    const fetchMock = vi.fn().mockResolvedValueOnce(json(200, inseeOk));
    vi.stubGlobal("fetch", fetchMock);
    expect((await lookupSiret(SIRET))?.source).toBe("insee");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers["X-INSEE-Api-Key-Integration"]).toBe("cle-de-test");
  });

  it("bascule si l'INSEE est en panne, hors quota ou injoignable", async () => {
    vi.stubEnv("INSEE_API_KEY", "cle-de-test");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const insee of [() => Promise.resolve(json(503, { header: { statut: 503 } })), () => Promise.resolve(json(429, {})), () => Promise.reject(new Error("timeout"))]) {
      const fetchMock = vi.fn().mockImplementationOnce(insee).mockResolvedValueOnce(json(200, recherche));
      vi.stubGlobal("fetch", fetchMock);
      expect((await lookupSiret(SIRET))?.source).toBe("recherche-entreprises");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  });

  it("ne bascule pas quand l'INSEE confirme que le SIRET n'existe pas", async () => {
    vi.stubEnv("INSEE_API_KEY", "cle-de-test");
    const fetchMock = vi.fn().mockResolvedValueOnce(json(404, { header: { statut: 404, message: "Aucun élément trouvé" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await lookupSiret(SIRET)).toEqual({ found: false, source: "insee" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sans clé : Recherche d'entreprises seule ; aucune réponse : null", async () => {
    vi.stubEnv("INSEE_API_KEY", "");
    const ok = vi.fn().mockResolvedValueOnce(json(200, recherche));
    vi.stubGlobal("fetch", ok);
    expect((await lookupSiret(SIRET))?.source).toBe("recherche-entreprises");
    expect(ok).toHaveBeenCalledTimes(1);

    vi.stubEnv("INSEE_API_KEY", "cle-de-test");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("réseau coupé")));
    expect(await lookupSiret(SIRET)).toBeNull();
  });
});
