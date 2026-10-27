import { describe, expect, it } from "vitest";
import { computeQuote } from "./pricing";

describe("computeQuote", () => {
  it("reproduit le devis du design (EquipHotel, 4 jours, 3 personnes)", () => {
    const quote = computeQuote({
      lines: [
        { label: "Commercial Karim", qty: 1, hourlyRateCents: 3100 },
        { label: "Commercial Sarah", qty: 1, hourlyRateCents: 3000 },
        { label: "Accueil Chloé", qty: 1, hourlyRateCents: 2000 },
      ],
      days: 4,
      billableHoursPerDay: 8,
      serviceFeePct: 12,
      vatPct: 20,
    });
    expect(quote.lines.map((l) => l.totalCents)).toEqual([99200, 96000, 64000]);
    expect(quote.subtotalCents).toBe(259200);
    expect(quote.serviceFeeCents).toBe(31104);
    expect(quote.totalHtCents).toBe(290304);
    expect(quote.vatCents).toBe(58061);
    expect(quote.totalTtcCents).toBe(348365);
  });
});
