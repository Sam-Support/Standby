export type QuoteLine = {
  label: string;
  qty: number;
  hourlyRateCents: number;
};

export type QuoteInput = {
  lines: QuoteLine[];
  days: number;
  billableHoursPerDay: number;
  serviceFeePct: number;
  vatPct: number;
};

export type Quote = {
  lines: { label: string; totalCents: number }[];
  subtotalCents: number;
  serviceFeeCents: number;
  totalHtCents: number;
  vatCents: number;
  totalTtcCents: number;
};

export function computeQuote(input: QuoteInput): Quote {
  const hours = input.days * input.billableHoursPerDay;
  const lines = input.lines.map((l) => ({
    label: l.label,
    totalCents: l.qty * l.hourlyRateCents * hours,
  }));
  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const serviceFeeCents = Math.round((subtotalCents * input.serviceFeePct) / 100);
  const totalHtCents = subtotalCents + serviceFeeCents;
  const vatCents = Math.round((totalHtCents * input.vatPct) / 100);
  return {
    lines,
    subtotalCents,
    serviceFeeCents,
    totalHtCents,
    vatCents,
    totalTtcCents: totalHtCents + vatCents,
  };
}
