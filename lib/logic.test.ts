import { describe, expect, it } from "vitest";
import { dateRange, dayNumbers, euros, hoursLabel, nextMonday } from "./format";
import { mapColumns, remapRow } from "./leads/mapping";
import { matchScore } from "./matching";
import { isValidSiret } from "./siret";

describe("mapColumns", () => {
  it("reconnaît 8 colonnes sur 9 comme dans le design", () => {
    const template = ["Nom", "Prénom", "Société", "Fonction", "Email", "Téléphone", "Produit d’intérêt", "Note", "Date du contact"];
    const headers = ["Nom", "Prénom", "Entreprise", "Poste", "E-mail", "Tél", "Intérêt", "Commentaire"];
    const m = mapColumns(template, headers);
    expect(m.recognized).toBe(8);
    expect(m.missing).toEqual(["Date du contact"]);
    expect(m.mapping["Société"]).toBe("Entreprise");
    expect(m.mapping["Téléphone"]).toBe("Tél");
    const row = remapRow({ Nom: "MARTIN", Prénom: "Manon", Entreprise: "Verdi Agro", Tél: "06" }, m, "2026-10-14");
    expect(row.completed).toBe(true);
    expect(row.data["Date du contact"]).toBe("2026-10-14");
    expect(Object.keys(row.data)).toEqual(template);
  });

  it("associe les champs HubSpot aux en-têtes français", () => {
    const m = mapColumns(["First name", "Last name", "Company name", "Job title", "Phone number"], ["Prénom", "Nom", "Société", "Fonction", "Téléphone"]);
    expect(m.missing).toEqual([]);
    expect(m.mapping["Last name"]).toBe("Nom");
  });
});

describe("matchScore", () => {
  it("favorise langues, spécialité et ville", () => {
    const base = { ratingX10: 48, missionsCount: 40, acceptRateBps: 10000, isFavorite: false };
    const criteria = { languages: ["Français", "Anglais"], specialty: "Agro & restauration", city: "Paris" };
    const good = matchScore({ ...base, languages: ["Français", "Anglais"], specialties: ["Agro & restauration"], city: "Paris" }, criteria);
    const weak = matchScore({ ...base, languages: ["Français"], specialties: ["Santé"], city: "Lille" }, criteria);
    expect(good.score).toBeGreaterThan(weak.score);
    expect(good.score).toBeLessThanOrEqual(100);
  });
});

describe("isValidSiret", () => {
  it("valide la clé de Luhn", () => {
    expect(isValidSiret("732 829 320 00074")).toBe(true);
    expect(isValidSiret("732 829 320 00075")).toBe(false);
    expect(isValidSiret("123")).toBe(false);
  });
});

describe("format", () => {
  it("formate montants et dates comme le design", () => {
    expect(euros(290304).replace(/\s/g, " ")).toBe("2 903 €");
    expect(dateRange("2026-11-02", "2026-11-05")).toBe("2 – 5 nov.");
    expect(dateRange("2026-11-30", "2026-12-02")).toBe("30 nov. – 2 déc.");
    expect(dayNumbers("2026-11-02", "2026-11-05")).toBe("2–5");
    expect(hoursLabel(450)).toBe("7 h 30");
    expect(nextMonday("2026-10-27")).toBe("2026-11-02");
    expect(nextMonday("2026-11-02")).toBe("2026-11-09");
  });
});
