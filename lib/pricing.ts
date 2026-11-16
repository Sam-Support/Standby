import { ROLES, ROLE_KEYS, type RoleKey } from "./domain";

function amplitudeMinutes(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const amplitude = toMin(end) - toMin(start);
  return Number.isFinite(amplitude) && amplitude > 0 ? amplitude : 0;
}

/** Une heure de pause est déduite au-delà de 6 h d'amplitude. */
export function hasBreak(start: string, end: string): boolean {
  return amplitudeMinutes(start, end) > 360;
}

/** Minutes facturées par jour : amplitude, moins une heure de pause au-delà de 6 h. */
export function billableMinutesPerDay(start: string, end: string): number {
  const amplitude = amplitudeMinutes(start, end);
  return hasBreak(start, end) ? amplitude - 60 : amplitude;
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
  const lines = input.positions
    .filter((p) => p.rates.length > 0)
    .map((p) => ({
      role: p.role,
      label: `${p.rates.length} × ${ROLES[p.role].short}`,
      qty: p.rates.length,
      minutesPerPerson,
      totalCents: Math.round(p.rates.reduce((sum, r) => sum + r * (minutesPerPerson / 60), 0)),
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

export type SimulationInput = {
  /** Nombre de personnes par poste */
  qty: Partial<Record<RoleKey, number>>;
  days: number;
  startTime: string;
  endTime: string;
  /** Tarifs planchers en vigueur, en centimes par heure */
  floors: Record<RoleKey, number>;
  serviceFeeBps: number;
  vatBps: number;
};

/**
 * Estimation « à partir de » du simulateur public : chaque personne au tarif plancher de son poste, avec le
 * même calcul que le devis d'une réservation (pause déduite, frais de service, TVA).
 */
export function simulateQuote(input: SimulationInput): Quote {
  const people = (r: RoleKey) => Math.max(0, Math.floor(input.qty[r] ?? 0));
  return computeQuote({
    positions: ROLE_KEYS.filter((r) => people(r) > 0).map((r) => ({ role: r, rates: Array<number>(people(r)).fill(input.floors[r]) })),
    days: Math.max(0, Math.floor(input.days)),
    billableMinutesPerDay: billableMinutesPerDay(input.startTime, input.endTime),
    serviceFeeBps: input.serviceFeeBps,
    vatBps: input.vatBps,
  });
}

/**
 * Paie d'un commercial à partir du HT de sa prestation : TVA ajoutée s'il y est assujetti (`vatBps` > 0),
 * commission plateforme retenue sur le HT. Le net est le montant viré.
 */
export function payoutBreakdown(grossCents: number, commissionBps: number, vatBps: number) {
  const commissionCents = Math.round((grossCents * commissionBps) / 10000);
  const vatCents = Math.round((grossCents * vatBps) / 10000);
  return { htCents: grossCents, vatCents, ttcCents: grossCents + vatCents, commissionCents, netCents: grossCents + vatCents - commissionCents };
}

export function payoutCents(hourlyRateCents: number, minutes: number, commissionBps: number): number {
  const gross = (hourlyRateCents * minutes) / 60;
  return Math.round(gross - (gross * commissionBps) / 10000);
}
