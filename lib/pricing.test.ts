import { describe, expect, it } from "vitest";
import { PRICING_DEFAULTS, ROLE_KEYS, type RoleKey } from "./domain";
import { billableMinutesPerDay, computeQuote, payoutCents, simulateQuote } from "./pricing";

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

describe("simulateQuote (simulateur de la page d'accueil)", () => {
  const floors = Object.fromEntries(ROLE_KEYS.map((r) => [r, PRICING_DEFAULTS[`floor:${r}`].value])) as Record<RoleKey, number>;
  const base = { days: 3, startTime: "09:00", endTime: "18:00", floors, serviceFeeBps: 1200, vatBps: 2000 };

  it("chiffre l'équipe aux tarifs planchers, comme un devis de réservation", () => {
    const quote = simulateQuote({ ...base, qty: { commercial: 2, accueil: 1 } });
    expect(quote.billableMinutesPerDay).toBe(480); // 9 h d'amplitude, 1 h de pause déduite
    expect(quote.people).toBe(3);
    expect(quote.subtotalCents).toBe(175200); // (2 × 27 € + 19 €) × 8 h × 3 jours
    expect(quote.serviceFeeCents).toBe(21024);
    expect(quote.totalHtCents).toBe(196224);
    expect(quote.totalTtcCents).toBe(235469);
  });

  it("donne zéro sans personne, sans jour ou avec des horaires inversés", () => {
    expect(simulateQuote({ ...base, qty: {} }).totalHtCents).toBe(0);
    expect(simulateQuote({ ...base, qty: { commercial: 1 }, days: 0 }).totalHtCents).toBe(0);
    expect(simulateQuote({ ...base, qty: { commercial: 1 }, startTime: "18:00", endTime: "09:00" }).totalHtCents).toBe(0);
    expect(simulateQuote({ ...base, qty: { commercial: -2, accueil: 1.9 } }).people).toBe(1);
  });
});
