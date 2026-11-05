import { describe, expect, it } from "vitest";
import { billableMinutesPerDay, computeQuote, payoutCents } from "./pricing";

describe("billableMinutesPerDay", () => {
  it("déduit une heure de pause au-delà de 6 h d'amplitude", () => {
    expect(billableMinutesPerDay("09:00", "18:00")).toBe(480);
    expect(billableMinutesPerDay("10:00", "14:00")).toBe(240);
    expect(billableMinutesPerDay("18:00", "09:00")).toBe(0);
  });
});

describe("computeQuote", () => {
  it("reproduit le devis du design (EquipHotel, 4 jours, 3 personnes)", () => {
    const quote = computeQuote({
      positions: [
        { role: "commercial", rates: [3100, 3000] },
        { role: "accueil", rates: [2000] },
      ],
      days: 4,
      billableMinutesPerDay: 480,
      serviceFeeBps: 1200,
      vatBps: 2000,
    });
    expect(quote.lines.map((l) => [l.label, l.totalCents])).toEqual([
      ["2 × Commercial", 195200],
      ["1 × Accueil", 64000],
    ]);
    expect(quote.subtotalCents).toBe(259200);
    expect(quote.serviceFeeCents).toBe(31104);
    expect(quote.totalHtCents).toBe(290304); // 2 903 € affichés
    expect(quote.vatCents).toBe(58061); // 581 €
    expect(quote.totalTtcCents).toBe(348365); // 3 484 €
    expect(quote.people).toBe(3);
  });

  it("applique la majoration tenue Standby par heure et par personne", () => {
    const quote = computeQuote({
      positions: [{ role: "accueil", rates: [2000] }],
      days: 1,
      billableMinutesPerDay: 480,
      serviceFeeBps: 0,
      vatBps: 0,
      surchargeCents: 300,
    });
    expect(quote.subtotalCents).toBe(8 * 2300);
  });

  it("ignore les postes sans personne", () => {
    const quote = computeQuote({ positions: [{ role: "interprete", rates: [] }], days: 2, billableMinutesPerDay: 480, serviceFeeBps: 1200, vatBps: 2000 });
    expect(quote.lines).toEqual([]);
    expect(quote.totalTtcCents).toBe(0);
  });
});

describe("payoutCents", () => {
  it("calcule le versement net de commission", () => {
    expect(payoutCents(3100, 960, 0)).toBe(49600);
    expect(payoutCents(3000, 60, 1000)).toBe(2700);
  });
});
