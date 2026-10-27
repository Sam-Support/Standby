import { ROLES, type RoleKey } from "./domain";

/** Minutes facturées par jour : amplitude, moins une heure de pause au-delà de 6 h. */
export function billableMinutesPerDay(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const amplitude = toMin(end) - toMin(start);
  if (!Number.isFinite(amplitude) || amplitude <= 0) return 0;
  return amplitude > 360 ? amplitude - 60 : amplitude;
}

export type QuotePosition = {
  role: RoleKey;
  /** Taux horaire de chaque personne, en centimes */
  rates: number[];
};

export type QuoteInput = {
  positions: QuotePosition[];
  days: number;
  billableMinutesPerDay: number;
  serviceFeeBps: number;
  vatBps: number;
  /** Majoration horaire par personne (tenue Standby), en centimes */
  surchargeCents?: number;
};

export type QuoteLine = {
  role: RoleKey;
  label: string;
  qty: number;
  minutesPerPerson: number;
  totalCents: number;
};

export type Quote = {
  lines: QuoteLine[];
  days: number;
  billableMinutesPerDay: number;
  people: number;
  subtotalCents: number;
  serviceFeeBps: number;
  serviceFeeCents: number;
  totalHtCents: number;
  vatBps: number;
  vatCents: number;
  totalTtcCents: number;
};

export function computeQuote(input: QuoteInput): Quote {
  const minutesPerPerson = input.days * input.billableMinutesPerDay;
  const surcharge = input.surchargeCents ?? 0;
  const lines = input.positions
    .filter((p) => p.rates.length > 0)
    .map((p) => ({
      role: p.role,
      label: `${p.rates.length} × ${ROLES[p.role].short}`,
      qty: p.rates.length,
      minutesPerPerson,
      totalCents: Math.round(p.rates.reduce((sum, r) => sum + (r + surcharge) * (minutesPerPerson / 60), 0)),
    }));
  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const serviceFeeCents = Math.round((subtotalCents * input.serviceFeeBps) / 10000);
  const totalHtCents = subtotalCents + serviceFeeCents;
  const vatCents = Math.round((totalHtCents * input.vatBps) / 10000);
  return {
    lines,
    days: input.days,
    billableMinutesPerDay: input.billableMinutesPerDay,
    people: lines.reduce((n, l) => n + l.qty, 0),
    subtotalCents,
    serviceFeeBps: input.serviceFeeBps,
    serviceFeeCents,
    totalHtCents,
    vatBps: input.vatBps,
    vatCents,
    totalTtcCents: totalHtCents + vatCents,
  };
}

/** Montant versé à un commercial pour ses minutes validées, commission déduite. */
export function payoutCents(hourlyRateCents: number, minutes: number, commissionBps: number): number {
  const gross = (hourlyRateCents * minutes) / 60;
  return Math.round(gross - (gross * commissionBps) / 10000);
}
